
import React from 'react';
import { Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Link } from 'react-router-dom'; // Import Link

interface WidgetProps {
  title: string;
  value: string;
  icon: IconProp;
  color: string;
  link?: string; // Optional link prop
}

const Widget: React.FC<WidgetProps> = ({ title, value, icon, color, link }) => {
  return (
    <Card className={`text-white bg-${color}`}>
      <Card.Body>
        <div className="fs-4 fw-semibold">{value}</div>
        <div>{title}</div>
        <div className="mt-3">
          <FontAwesomeIcon icon={icon} size="3x" />
        </div>
        {link && ( // Conditionally render the link
          <div className="mt-3 text-end">
            <Link to={link} className="btn btn-light btn-sm">Ver</Link>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default Widget;
