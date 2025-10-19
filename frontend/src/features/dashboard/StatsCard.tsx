
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface StatsCardProps {
  title: string;
  value: string;
  icon: IconProp;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="card" style={{ borderLeft: `.25rem solid ${color}` }}>
      <div className="card-body">
        <div className="row no-gutters align-items-center">
          <div className="col mr-2">
            <div className="text-xs font-weight-bold text-uppercase mb-1" style={{ color: color }}>
              {title}
            </div>
            <div className="h5 mb-0 font-weight-bold text-gray-800">{value}</div>
          </div>
          <div className="col-auto">
            <FontAwesomeIcon icon={icon} className="fa-2x text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
