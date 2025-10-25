import { type ReactElement, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { StorageType } from '@/types/settings';

/**
 * Storage Migration Wizard
 * Guides users through migrating between storage types
 */
interface StorageMigrationWizardProps {
  currentStorage: StorageType;
  onComplete: () => void;
  onCancel: () => void;
}

export function StorageMigrationWizard({
  currentStorage,
  onComplete,
  onCancel,
}: StorageMigrationWizardProps): ReactElement {
  const [step, setStep] = useState(1);
  const [targetStorage, setTargetStorage] = useState<StorageType | null>(null);

  const storageOptions: Array<{ type: StorageType; label: string; description: string }> = [
    {
      type: 'local',
      label: 'Local Storage',
      description: 'Store snippets locally on this device',
    },
    {
      type: 'git',
      label: 'Git Repository',
      description: 'Sync snippets using a Git repository (Coming Soon)',
    },
    {
      type: 'cloud',
      label: 'Cloud Sync',
      description: 'Sync snippets across devices via cloud (Coming Soon)',
    },
  ];

  const handleTargetSelect = (type: StorageType): void => {
    setTargetStorage(type);
    setStep(2);
  };

  const handleMigrate = async (): Promise<void> => {
    // Placeholder for actual migration logic
    // This will be implemented when Git and Cloud storage are ready
    alert('Migration feature will be available when Git/Cloud storage is implemented');
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Storage Migration Wizard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Migrate your snippets to a different storage type
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                1
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Select Target</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                2
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Configure</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4" />
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                3
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Migrate</span>
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Select Target Storage Type
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Current storage: <strong>{currentStorage}</strong>
                </p>
                <div className="space-y-3">
                  {storageOptions
                    .filter((option) => option.type !== currentStorage)
                    .map((option) => (
                      <button
                        key={option.type}
                        onClick={() => handleTargetSelect(option.type)}
                        disabled={option.type !== 'local'}
                        className={`
                          w-full p-4 rounded-lg border-2 text-left transition-all
                          ${
                            option.type === 'local'
                              ? 'border-gray-200 dark:border-gray-700 hover:border-blue-500 cursor-pointer'
                              : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          }
                        `}
                      >
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {option.label}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {option.description}
                        </p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {step === 2 && targetStorage && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Configure {targetStorage} Storage
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Configuration options will be available when this storage type is implemented.
                </p>
                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setStep(1)} variant="secondary">
                    Back
                  </Button>
                  <Button onClick={handleMigrate}>Start Migration</Button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
