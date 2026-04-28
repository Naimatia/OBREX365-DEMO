// utils/whatsappShare.js

/**
 * Format price as AED currency
 */
const formatAED = (price) =>
  price != null
    ? new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        maximumFractionDigits: 0,
      }).format(price)
    : 'Price on request';

/**
 * Format date as DD/MM/YYYY
 */
const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';

/**
 * Build clean contact block from company data
 */
const buildContactBlock = (company = {}) => {
  const lines = [];
  if (company.name) lines.push(`Company: ${company.name}`);
  if (company.phoneNumber) lines.push(`Phone: ${company.phoneNumber}`);
  if (company.emailAddress) lines.push(`Email: ${company.emailAddress}`);
  if (company.websiteUrl) lines.push(`Website: ${company.websiteUrl}`);

  return lines.length > 0 ? lines.join('\n') : '';
};

// ──────────────────────────────────────────────────────────────
// SINGLE PROPERTY MESSAGE
// ──────────────────────────────────────────────────────────────
export const generateWhatsAppPropertyMessage = (property, company = {}) => {
  if (!property) return '';

  const companyName = company.name || 'Our Real Estate Agency';
  const contactBlock = buildContactBlock(company);
  const propertyUrl = `${window.location.origin}/properties/${property.id || ''}`;

  const lines = [
    `Hello! 👋`,
    ``,
    `${companyName} has a great property for you:`,
    ``,
    `────────────────────────────`,
    `🏠 PROPERTY DETAILS`,
    `────────────────────────────`,
    ``,
    `*${property.title || 'Property'}*`,
    ``,
    `Location : ${property.Location || property.address || 'Not specified'}`,
    `Type     : ${property.Type || 'N/A'}`,
    `Status   : ${property.Status || 'Available'}`,
    property.NbrBedRooms != null ? `Bedrooms : ${property.NbrBedRooms}` : '',
    property.NbrBathRooms != null ? `Bathrooms: ${property.NbrBathRooms}` : '',
    property.area ? `Area     : ${property.area} sq.ft` : '',
    ``,
    `Price    : ${formatAED(property.SellPrice)}`,
    property.OriginalPrice ? `Original : ${formatAED(property.OriginalPrice)}` : '',
    ``,
    property.description ? `Description:\n${property.description}\n` : '',
    `Listed on: ${formatDate(property.CreationDate)}`,
    ``,
    `────────────────────────────`,
    `📞 CONTACT INFORMATION`,
    `────────────────────────────`,
    ``,
    contactBlock || 'Contact us for more information',
    ``,
    `────────────────────────────`,
    `NEXT STEPS`,
    `────────────────────────────`,
    ``,
    `Looking forward to helping you find your perfect property!`,
  ].filter(Boolean).join('\n');

  return encodeURIComponent(lines.trim());
};

// ──────────────────────────────────────────────────────────────
// MULTIPLE PROPERTIES MESSAGE
// ──────────────────────────────────────────────────────────────
export const generateWhatsAppMultiplePropertiesMessage = (properties, company = {}) => {
  if (!Array.isArray(properties) || properties.length === 0) return '';

  const companyName = company.name || 'Our Real Estate Agency';
  const contactBlock = buildContactBlock(company);

  const propertyList = properties.map((prop, index) => {
    return [
      `${index + 1}. ${prop.title || 'Untitled Property'}`,
      `   Price : ${formatAED(prop.SellPrice)}`,
      `   Type  : ${prop.Type || 'N/A'}`,
      `   Loc   : ${prop.Location || prop.address || 'N/A'}`,
      prop.NbrBedRooms != null ? `   Beds  : ${prop.NbrBedRooms}` : '',
      prop.NbrBathRooms != null ? `   Baths : ${prop.NbrBathRooms}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const lines = [
    `Hello! 👋`,
    ``,
    `${companyName} has selected ${properties.length} properties for you:`,
    ``,
    `────────────────────────────`,
    `🏘 SELECTED PROPERTIES`,
    `────────────────────────────`,
    ``,
    propertyList,
    ``,
    `────────────────────────────`,
    `📞 CONTACT INFORMATION`,
    `────────────────────────────`,
    ``,
    contactBlock || 'Contact us for more information',
    ``,
    `────────────────────────────`,
    `NEXT STEPS`,
    `────────────────────────────`,
    ``,
    `Please reply with the number(s) of the properties you're interested in.`,
    `We will send you detailed photos, floor plans, and booking options.`,
    ``,
    `Looking forward to helping you find your perfect property!`,
  ].filter(Boolean).join('\n');

  return encodeURIComponent(lines.trim());
};

// ──────────────────────────────────────────────────────────────
// OPEN WHATSAPP
// ──────────────────────────────────────────────────────────────
export const openWhatsApp = (encodedMessage, phoneNumber = null) => {
  if (!encodedMessage) return;

  let url;
  if (phoneNumber) {
    // Send to specific number
    url = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`;
  } else {
    // Let user choose contact
    url = `https://api.whatsapp.com/send?text=${encodedMessage}`;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
};