
import React from 'react';
import { Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface WidgetProps {
  title: string;
  value: string;
  icon: IconProp;
  color: string;
}

const Widget: React.FC<WidgetProps> = ({ title, value, icon, color }) => {
  return (
    <Card className={`text-white bg-${color}`}>
      <Card.Body>
        <div className="fs-4 fw-semibold">{value}</div>
        <div>{title}</div>
        <div className="mt-3">
          <FontAwesomeIcon icon={icon} size="3x" />
        </div>
      </Card.Body>
    </Card>
  );
};

export default Widget;
