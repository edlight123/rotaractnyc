/**
 * Google Workspace — barrel export.
 */

export {
  getGoogleSettings,
  updateGoogleSettings,
  isServiceAccountConfigured,
  isOAuth2Configured,
  getConsentUrl,
  exchangeCodeForTokens,
  getAuthedOAuth2Client,
  type GoogleWorkspaceSettings,
} from './client';

export {
  syncEventToCalendar,
  deleteCalendarEvent,
  syncAllEvents,
  listCalendarEvents,
} from './calendar';

export {
  ensureSpreadsheet,
  exportMembers,
  exportDues,
  exportEvents,
  exportAttendance,
  exportAllToSheets,
} from './sheets';

export {
  listFiles,
  listFolders,
  createFolder,
  uploadFile,
  deleteFile,
  getFile,
  shareWithUser,
  shareWithLink,
  type DriveFile,
  type DriveFolder,
} from './drive';

export {
  isDirectoryConfigured,
  suggestOrgEmail,
  generateOrgEmail,
  emailExists,
  generateTemporaryPassword,
  createWorkspaceUser,
  suspendWorkspaceUser,
  checkDirectoryConnection,
  type CreateWorkspaceUserInput,
  type CreateWorkspaceUserResult,
  type DirectoryConnectionStatus,
} from './directory';

export {
  isGroupsConfigured,
  committeeGroupEmail,
  groupExists,
  getGroup,
  createGroup,
  ensureGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  listGroupMembers,
  checkGroupsConnection,
  type GroupInfo,
  type CreateGroupInput,
  type GroupMemberRole,
  type GroupsConnectionStatus,
} from './groups';
