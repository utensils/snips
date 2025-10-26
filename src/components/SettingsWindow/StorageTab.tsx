import { type ReactElement, useEffect, useState } from 'react';

import { CheckSymbolic } from '@/components/adwaita';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  backupDatabase,
  getDatabaseStats,
  getSettings,
  listBackups,
  restoreDatabase,
  updateSettings,
} from '@/lib/api';
import type { AppSettings, StorageType } from '@/types/settings';
import type { BackupInfo, DatabaseStats } from '@/types/storage';

import { StorageMigrationWizard } from './StorageMigrationWizard';

/**
 * Storage Settings Tab
 * Manages storage type, backups, and database operations
 */
export function StorageTab(): ReactElement {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMigrationWizard, setShowMigrationWizard] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const [settingsData, statsData, backupsData] = await Promise.all([
        getSettings(),
        getDatabaseStats(),
        listBackups(),
      ]);
      setSettings(settingsData);
      setStats(statsData);
      setBackups(backupsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStorageTypeChange = async (storageType: StorageType): Promise<void> => {
    if (!settings) return;

    try {
      setError(null);
      const updatedSettings: AppSettings = {
        ...settings,
        storage_type: storageType,
      };
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      showSuccess('Storage type updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update storage type');
    }
  };

  const handleBackup = async (): Promise<void> => {
    try {
      setIsBackingUp(true);
      setError(null);
      const backup = await backupDatabase();
      setBackups([backup, ...backups]);
      showSuccess('Backup created successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (backupPath: string): Promise<void> => {
    if (!confirm('Are you sure you want to restore this backup? Current data will be replaced.')) {
      return;
    }

    try {
      setError(null);
      await restoreDatabase(backupPath);
      await loadData();
      showSuccess('Database restored successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    }
  };

  const showSuccess = (message: string): void => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Storage Settings
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Manage storage type, backups, and database
        </p>
      </div>

      {/* Status Messages - Fixed height container prevents layout shift */}
      <div className="min-h-[60px]">
        {error && (
          <Card className="p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 transition-opacity duration-300">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}
        {successMessage && (
          <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 transition-opacity duration-300">
            <p className="text-green-600 dark:text-green-400">{successMessage}</p>
          </Card>
        )}
      </div>

      {/* Database Stats */}
      {stats && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Database Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Snippets</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.total_snippets}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Tags</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {stats.total_tags}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Database Size</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatBytes(stats.database_size_bytes)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Backup</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {stats.last_backup ? formatDate(stats.last_backup) : 'Never'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Storage Type */}
      {settings && (
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                Storage Type
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose where your snippets are stored
              </p>
            </div>

            <div className="space-y-3">
              <StorageTypeOption
                label="Local"
                description="Store snippets locally on this device"
                value="local"
                currentType={settings.storage_type}
                onSelect={handleStorageTypeChange}
              />
              <StorageTypeOption
                label="Git"
                description="Sync snippets using a Git repository (Coming Soon)"
                value="git"
                currentType={settings.storage_type}
                onSelect={handleStorageTypeChange}
                disabled
              />
              <StorageTypeOption
                label="Cloud"
                description="Sync snippets across devices via cloud (Coming Soon)"
                value="cloud"
                currentType={settings.storage_type}
                onSelect={handleStorageTypeChange}
                disabled
              />
            </div>
          </div>

          <div className="mt-4">
            <Button variant="secondary" onClick={() => setShowMigrationWizard(true)}>
              Migrate Storage Type
            </Button>
          </div>
        </Card>
      )}

      {/* Local Storage Management */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              Backup & Restore
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create backups and restore from previous versions
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleBackup} disabled={isBackingUp}>
              {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
            </Button>
          </div>

          {/* Backup List */}
          {backups.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available Backups
              </h4>
              <div className="space-y-2">
                {backups.slice(0, 5).map((backup) => (
                  <div
                    key={backup.path}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {backup.path.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(backup.created_at)} · {formatBytes(backup.size_bytes)}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRestore(backup.path)}
                    >
                      Restore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Migration Wizard */}
      {showMigrationWizard && settings && (
        <StorageMigrationWizard
          currentStorage={settings.storage_type}
          onComplete={() => {
            setShowMigrationWizard(false);
            loadData();
          }}
          onCancel={() => setShowMigrationWizard(false)}
        />
      )}
    </div>
  );
}

/**
 * Storage type selection option
 */
interface StorageTypeOptionProps {
  label: string;
  description: string;
  value: StorageType;
  currentType: StorageType;
  onSelect: (type: StorageType) => void;
  disabled?: boolean;
}

function StorageTypeOption({
  label,
  description,
  value,
  currentType,
  onSelect,
  disabled = false,
}: StorageTypeOptionProps): ReactElement {
  const isSelected = currentType === value;

  return (
    <button
      onClick={() => !disabled && onSelect(value)}
      disabled={disabled}
      className={`
        w-full p-4 rounded-lg border-2 text-left transition-all
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{label}</h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
        </div>
        {isSelected && (
          <div className="ml-3 flex-shrink-0">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
              <CheckSymbolic className="h-3 w-3 text-white" strokeWidth={2} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
