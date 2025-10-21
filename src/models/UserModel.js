/**
 * User model interface based on Firestore schema
 * This serves as documentation for the User collection structure
 */
export const UserModel = {
  id: '',
  firstname: '',
  lastname: '',
  email: '',
  secondaryEmail: '', // Optional secondary email
  phoneNumber: '',
  phoneNumber2: '', // Optional second phone number
  phoneNumber3: '', // Optional third phone number
  country: '',
  ipAddress: '',
  pictureUrl: '',
  CreationDate: null, // Firebase Timestamp
  LastLogin: null, // Firebase Timestamp
  Password: '', // This is not stored directly but through Firebase Auth
  isVerified: false,
  isBanned: false,
  Role: '', // Enum: SuperAdmin, CEO, HR, Seller
  company_id: '',
  Notification: false,
  forcePasswordReset: false
}

/**
 * User roles enum
 */
export const UserRoles = {
  SUPER_ADMIN: 'SuperAdmin',
  CEO: 'CEO',
  HR: 'HR',
  SELLER: 'Seller',
  COORDINATOR: 'Coordinator',
  SALES_EXECUTIVE: 'SalesExecutive',
  AGENT: 'Agent',
  TEAM_LEADER: 'TeamLeader',
  SALES_MANAGER: 'SalesManager',
  MARKETING_MANAGER: 'MarketingManager',
  OFF_PLAN_SALES: 'OffPlanSales',
  READY_TO_MOVE_SALES: 'ReadyToMoveSales',
  SECRETARY: 'Secretary',
  FRONT_DESK_OFFICER: 'FrontDeskOfficer',
  OFFICE_BOY: 'OfficeBoy',
  ACCOUNTANT: 'Accountant',
  HUMAN_RESOURCES: 'HumanResources',
  PUBLIC_RELATIONS_OFFICER: 'PublicRelationsOfficer'
};

/**
 * Convert Firebase user to app user model
 * @param {Object} firebaseUser - Firebase user object
 * @param {Object} userData - Additional user data from Firestore
 * @returns {Object} - User model object
 */
export const convertToUserModel = (firebaseUser, userData = {}) => {
  return {
    id: firebaseUser.uid || '',
    email: firebaseUser.email || '',
    secondaryEmail: userData.secondaryEmail || '',
    firstname: userData.firstname || '',
    lastname: userData.lastname || '',
    phoneNumber: userData.phoneNumber || '',
    phoneNumber2: userData.phoneNumber2 || '',
    phoneNumber3: userData.phoneNumber3 || '',
    country: userData.country || '',
    ipAddress: userData.ipAddress || '',
    pictureUrl: userData.pictureUrl || firebaseUser.photoURL || '',
    CreationDate: userData.CreationDate || null,
    LastLogin: userData.LastLogin || null,
    isVerified: firebaseUser.emailVerified || false,
    isBanned: userData.isBanned || false,
    Role: userData.role || '',
    company_id: userData.company_id || '',
    Notification: userData.Notification || false,
    forcePasswordReset: userData.forcePasswordReset || false
  }
}

export default UserModel;
