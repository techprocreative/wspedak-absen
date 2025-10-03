export const storageManager = {
  getAttendanceRecords: jest.fn(),
  saveAttendanceRecord: jest.fn(),
  getAttendanceRecord: jest.fn(),
  deleteAttendanceRecord: jest.fn(),
  getUsers: jest.fn(),
  saveUser: jest.fn(),
  getUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getSyncQueueItems: jest.fn(),
  addSyncQueueItem: jest.fn(),
  updateSyncQueueItem: jest.fn(),
  removeSyncQueueItem: jest.fn(),
  getOfflineData: jest.fn(),
  saveOfflineData: jest.fn(),
  getSettings: jest.fn(),
  saveSettings: jest.fn(),
  clearAllData: jest.fn(),
};

export const AttendanceRecord = {};
export const User = {};
export const SyncQueueItem = {};
export const OfflineData = {};
export const AppSettings = {};