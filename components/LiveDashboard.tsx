import React from 'react';
import { ClientGroup } from '../types';
import { ClientColumn } from './ClientColumn';

interface LiveDashboardProps {
  data: ClientGroup[];
  darkMode: boolean;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({ data, darkMode }) => {
  return (
    <div className="h-full">
      {/* 
        Dynamic Grid System:
        - Mobile: 1 col
        - Tablet: 2 cols
        - Desktop: 3 cols
        - Large Desktop (4K): 4 or 5 cols depending on count
       */}
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
        
        {data.length === 0 && (
          <div className="col-span-full h-96 flex items-center justify-center text-gray-500">
            <p className="text-xl">Esperando datos en tiempo real...</p>
          </div>
        )}
      </div>
    </div>
  );
};
