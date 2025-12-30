import React from 'react';
import { ClientGroup } from '../types.ts';
import { ClientColumn } from './ClientColumn.tsx';

interface LiveDashboardProps {
  data: ClientGroup[];
  darkMode: boolean;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({ data, darkMode }) => {
  return (
    <div className="h-full">
      <div className={`
        grid gap-6 h-full items-start
        grid-cols-1 
        md:grid-cols-2 
        lg:grid-cols-3 
        2xl:grid-cols-4
        3xl:grid-cols-5
      `}>
        {data.map((clientGroup) => (
          <ClientColumn 
            key={clientGroup.clientId} 
            data={clientGroup} 
            darkMode={darkMode} 
          />
        ))}
      </div>
    </div>
  );
};