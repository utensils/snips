import React, { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import type { Snippet } from '@/types';

/**
 * Duplicate group - snippets that are similar to each other
 */
interface DuplicateGroup {
  snippets: Snippet[];
  similarity: number;
}

/**
 * DuplicateDetection Props
 */
interface DuplicateDetectionProps {
  snippets: Snippet[];
  onMerge: (keepId: number, removeIds: number[]) => Promise<void>;
  onDelete: (snippetIds: number[]) => Promise<void>;
  onClose: () => void;
}

/**
 * DuplicateDetection - Detects and manages duplicate snippets
 */
export function DuplicateDetection({
  snippets,
  onMerge,
  onDelete,
  onClose,
}: DuplicateDetectionProps): React.ReactElement {
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);

  /**
   * Calculates similarity between two strings using Levenshtein-like approach
   */
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    // Simple character-based similarity
    const longerLength = longer.length;
    const editDistance = getEditDistance(longer, shorter);
    return (longerLength - editDistance) / longerLength;
  };

  /**
   * Calculates edit distance between two strings
   */
  const getEditDistance = (str1: string, str2: string): number => {
    const costs: number[] = [];
    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1] ?? 0;
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j] ?? 0) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) {
        costs[str2.length] = lastValue;
      }
    }
    return costs[str2.length] ?? 0;
  };

  /**
   * Analyzes snippets for duplicates
   */
  const analyzeForDuplicates = (): void => {
    setIsAnalyzing(true);

    // Use setTimeout to not block UI
    setTimeout(() => {
      const groups: DuplicateGroup[] = [];
      const processed = new Set<number>();
      const threshold = 0.85; // 85% similarity threshold

      for (let i = 0; i < snippets.length; i++) {
        const currentSnippet = snippets[i];
        if (!currentSnippet || processed.has(currentSnippet.id)) {
          continue;
        }

        const similarSnippets: Snippet[] = [currentSnippet];
        let maxSimilarity = 0;

        for (let j = i + 1; j < snippets.length; j++) {
          const compareSnippet = snippets[j];
          if (!compareSnippet || processed.has(compareSnippet.id)) {
            continue;
          }

          // Check content similarity
          const contentSimilarity = calculateSimilarity(
            currentSnippet.content.toLowerCase(),
            compareSnippet.content.toLowerCase()
          );

          // Check name similarity
          const nameSimilarity = calculateSimilarity(
            currentSnippet.name.toLowerCase(),
            compareSnippet.name.toLowerCase()
          );

          // Use weighted average (content is more important)
          const similarity = contentSimilarity * 0.8 + nameSimilarity * 0.2;

          if (similarity >= threshold) {
            similarSnippets.push(compareSnippet);
            processed.add(compareSnippet.id);
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }

        if (similarSnippets.length > 1) {
          groups.push({
            snippets: similarSnippets,
            similarity: maxSimilarity,
          });
          processed.add(currentSnippet.id);
        }
      }

      setDuplicateGroups(groups);
      setHasAnalyzed(true);
      setIsAnalyzing(false);
    }, 100);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] mx-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Duplicate Detection
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Find and manage duplicate or similar snippets
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasAnalyzed ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Analyze {snippets.length} snippets to find duplicates based on content and name
                similarity.
              </p>
              <Button onClick={analyzeForDuplicates} variant="primary" disabled={isAnalyzing}>
                {isAnalyzing ? 'Analyzing...' : 'Analyze for Duplicates'}
              </Button>
            </div>
          ) : duplicateGroups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                No duplicates found!
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                All your snippets appear to be unique.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-700 dark:text-gray-300">
                Found {duplicateGroups.length} group{duplicateGroups.length > 1 ? 's' : ''} of
                similar snippets:
              </p>

              {duplicateGroups.map((group, groupIndex) => (
                <DuplicateGroupCard
                  key={groupIndex}
                  group={group}
                  onMerge={onMerge}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * DuplicateGroupCard - Displays a group of duplicate snippets
 */
interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  onMerge: (keepId: number, removeIds: number[]) => Promise<void>;
  onDelete: (snippetIds: number[]) => Promise<void>;
}

function DuplicateGroupCard({
  group,
  onMerge,
  onDelete,
}: DuplicateGroupCardProps): React.ReactElement {
  const [selectedToKeep, setSelectedToKeep] = useState<number>(group.snippets[0]?.id ?? 0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleMerge = async (): Promise<void> => {
    const removeIds = group.snippets.filter((s) => s.id !== selectedToKeep).map((s) => s.id);

    setIsProcessing(true);
    try {
      await onMerge(selectedToKeep, removeIds);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async (): Promise<void> => {
    const allIds = group.snippets.map((s) => s.id);

    setIsProcessing(true);
    try {
      await onDelete(allIds);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {group.snippets.length} similar snippets
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              ({Math.round(group.similarity * 100)}% similar)
            </span>
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleMerge} variant="primary" size="sm" disabled={isProcessing}>
              Merge (Keep Selected)
            </Button>
            <Button onClick={handleDeleteAll} variant="danger" size="sm" disabled={isProcessing}>
              Delete All
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {group.snippets.map((snippet) => (
            <div
              key={snippet.id}
              className={`
                p-3 rounded-lg border-2 transition-colors cursor-pointer
                ${
                  selectedToKeep === snippet.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              onClick={() => setSelectedToKeep(snippet.id)}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={selectedToKeep === snippet.id}
                    onChange={() => setSelectedToKeep(snippet.id)}
                    aria-label={`Keep ${snippet.name}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{snippet.name}</h4>
                  {snippet.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {snippet.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                    {snippet.content}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Created {new Date(snippet.created_at).toLocaleDateString()}</span>
                    <span>Updated {new Date(snippet.updated_at).toLocaleDateString()}</span>
                    {snippet.tags && snippet.tags.length > 0 && (
                      <span>Tags: {snippet.tags.join(', ')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
