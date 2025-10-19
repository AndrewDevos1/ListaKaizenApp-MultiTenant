
import React from 'react';
import UserStats from './UserStats';
import WorkAreasList from './WorkAreasList';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1 className="h3 mb-4 text-gray-800">Meu Dashboard</h1>
      <UserStats />
      <hr className="my-4" />
      <WorkAreasList />
    </div>
  );
};

export default Dashboard;
