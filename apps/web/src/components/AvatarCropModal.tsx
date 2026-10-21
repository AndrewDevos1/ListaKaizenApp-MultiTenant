'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

interface Props {
  show: boolean;
  imageSrc: string; // data URL from FileReader
  onConfirm: (croppedBase64: string) => void;
  onCancel: () => void;
}

export default function AvatarCropModal({ show, imageSrc, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const CANVAS_SIZE = 300; // display canvas size
  const OUTPUT_SIZE = 200; // final output size
  const CIRCLE_RADIUS = 120; // crop circle radius on display canvas

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    setImgLoaded(false);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image centered with zoom and offset
    const scale = zoom * Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const cx = CANVAS_SIZE / 2 + offset.x - w / 2;
    const cy = CANVAS_SIZE / 2 + offset.y - h / 2;

    ctx.drawImage(img, cx, cy, w, h);

    // Dark overlay outside circle
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();

    // Circle border
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Update preview
    const preview = previewRef.current;
    if (preview) {
      const pCtx = preview.getContext('2d')!;
      pCtx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      pCtx.save();
      pCtx.beginPath();
      pCtx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      pCtx.clip();
      // Scale from display to output
      const srcX = CANVAS_SIZE / 2 - CIRCLE_RADIUS;
      const srcY = CANVAS_SIZE / 2 - CIRCLE_RADIUS;
      pCtx.drawImage(canvas, srcX, srcY, CIRCLE_RADIUS * 2, CIRCLE_RADIUS * 2, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      pCtx.restore();
    }
  }, [offset, zoom]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, draw]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const handleMouseUp = () => { isDragging.current = false; };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const dx = e.touches[0].clientX - lastPos.current.x;
    const dy = e.touches[0].clientY - lastPos.current.y;
    lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const handleTouchEnd = () => { isDragging.current = false; };

  const handleConfirm = () => {
    const preview = previewRef.current;
    if (!preview) return;
    const base64 = preview.toDataURL('image/jpeg', 0.85);
    onConfirm(base64);
  };

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Recortar Foto de Perfil</Modal.Title>
      </Modal.Header>
      <Modal.Body className="d-flex flex-column align-items-center gap-3">
        <p className="text-muted text-center mb-0" style={{ fontSize: '0.85rem' }}>
          Arraste para reposicionar · Use o zoom para ajustar
        </p>

        {/* Main crop canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ cursor: 'grab', borderRadius: 8, border: '1px solid #dee2e6', touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

        {/* Zoom slider */}
        <div className="w-100">
          <Form.Label className="text-muted" style={{ fontSize: '0.82rem' }}>
            Zoom: {zoom.toFixed(1)}x
          </Form.Label>
          <Form.Range
            min={0.5}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
        </div>

        {/* Circular preview */}
        <div>
          <p className="text-center text-muted mb-1" style={{ fontSize: '0.82rem' }}>Previa</p>
          <canvas
            ref={previewRef}
            width={OUTPUT_SIZE}
            height={OUTPUT_SIZE}
            style={{ borderRadius: '50%', border: '2px solid #dee2e6', width: 80, height: 80 }}
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" onClick={handleConfirm} disabled={!imgLoaded}>
          Confirmar Foto
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
