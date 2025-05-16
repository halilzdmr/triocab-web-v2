import React from 'react';

const SkeletonRow: React.FC = () => {
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-20"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-32"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-40"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-10"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-16"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-4 bg-neutral-200 rounded animate-pulse w-24"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="h-5 bg-neutral-200 rounded-full animate-pulse w-5 ml-auto"></div>
      </td>
    </tr>
  );
};

export default SkeletonRow;