
import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100%' }}>
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
};

export default Spinner;
