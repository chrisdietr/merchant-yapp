import adminConfig from '../config/admin.json'

// Define a type for the admin object structure
type AdminConfig = {
  admins: (string | { ens: string; address: string })[];
};

export function isAdmin(address: string): boolean {
  if (!address) return false;
  
  // Normalize the address
  const normalizedAddress = address.toLowerCase();
  
  // Get all admin addresses from the config
  const adminAddresses = (adminConfig as AdminConfig).admins.flatMap(admin => {
    if (typeof admin === 'string') {
      // Legacy format (string only)
      return [admin.toLowerCase()];
    } else if (typeof admin === 'object') {
      // New format with ens and address fields
      const addresses: string[] = [];
      if (admin.ens) addresses.push(admin.ens.toLowerCase());
      if (admin.address) addresses.push(admin.address.toLowerCase());
      return addresses;
    }
    return [];
  });
  
  // Check if the address is in the admin list
  return adminAddresses.includes(normalizedAddress);
}

export function requireAdmin(address: string | undefined): boolean {
  if (!address) return false
  return isAdmin(address)
} 