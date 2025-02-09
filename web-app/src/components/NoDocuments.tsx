import { ArrowPathIcon } from "@heroicons/react/24/outline";
import React from "react";

interface NoDocumentsProps {
  filterTags: string[] | null;
  onReload: () => void;
  processing: boolean;
}

const NoDocuments: React.FC<NoDocumentsProps> = ({
  filterTags,
  onReload,
  processing,
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
    <p className="text-xl font-semibold mb-4">
      No documents found with filter tag(s):{" "}
      {(filterTags || []).map((tag) => (
        <span 
          key={tag} 
          className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium px-2.5 py-0.5 rounded-full mx-1"
        >
          {tag}
        </span>
      ))}
      .
    </p>
    <button
      onClick={onReload}
      disabled={processing}
      className="flex items-center bg-blue-600 dark:bg-blue-800 text-white dark:text-gray-200 px-4 py-2 rounded hover:bg-blue-700 dark:hover:bg-blue-900 focus:outline-none"
    >
      Reload
      <ArrowPathIcon className="h-5 w-5 ml-2" />
    </button>
  </div>
);

export default NoDocuments;