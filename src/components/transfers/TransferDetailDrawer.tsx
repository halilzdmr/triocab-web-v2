import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, Calendar, Clock, Users, Phone, Plane, Car, Navigation, Share2, Copy, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Import the API base URL from the same place useTransfers hook uses it
// Applying rule: Always add debug logs & comments in the code for easier debug & readability
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.bodrumluxurytravel.com' 
  : 'http://localhost:5001';  // Using the same IP address that Vite shows in the Network URL
import { Transfer } from '../../types';

/**
 * Formats a phone number for WhatsApp URL
 * Removes all non-numeric characters and ensures the number is in international format
 * 
 * Applying rule: Always add debug logs & comments in the code for easier debug & readability
 */
const formatPhoneForWhatsApp = (phone: string): string => {
  // Remove all non-numeric characters
  let formattedPhone = phone.replace(/\D/g, '');
  
  // If the number doesn't start with +, add it (assume it's in international format)
  if (!phone.startsWith('+')) {
    // If it starts with a 0, remove it as international format doesn't use leading 0
    if (formattedPhone.startsWith('0')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Add country code for Turkey if not already present and it's a Turkish number format
    // You may need to adjust this logic based on your typical phone number formats
    if (formattedPhone.length === 10) { // Turkish numbers are 10 digits without country code
      formattedPhone = `90${formattedPhone}`;
    }
  }
  
  console.debug('Formatted phone for WhatsApp:', { original: phone, formatted: formattedPhone });
  return formattedPhone;
};

interface TransferDetailDrawerProps {
  transfer: Transfer | null;
  isOpen: boolean;
  onClose: () => void;
}

const TransferDetailDrawer: React.FC<TransferDetailDrawerProps> = ({
  transfer,
  isOpen,
  onClose,
}) => {
  // State to track if the user is on a mobile device
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const [isMobile, setIsMobile] = useState(false);
  
  // State to track which location's map menu is open
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const [openMapMenu, setOpenMapMenu] = useState<'pickup' | 'dropoff' | null>(null);
  
  // State for share link functionality
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const [shareLink, setShareLink] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareError, setShareError] = useState<string>('');
  
  // Get authentication context to access the JWT token
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const { user } = useAuth();
  
  // Reset share link state when a new transfer is selected
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  useEffect(() => {
    if (transfer?.id) {
      console.debug('New transfer selected, resetting share link state:', transfer.id);
      setShareLink('');
      setIsGeneratingLink(false);
      setLinkCopied(false);
      setShareError('');
    }
  }, [transfer?.id]);
  
  // Check if device is mobile on component mount
  useEffect(() => {
    const checkMobile = () => {
      // Force mobile mode for testing in development
      const forceMobile = process.env.NODE_ENV === 'development';
      
      // Use either forced mode or actual device detection
      const mobile = forceMobile || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.debug('Device detection:', { isMobile: mobile, userAgent: navigator.userAgent, forceMobile });
      setIsMobile(mobile);
    };
    
    checkMobile();
    
    // Update on resize, in case of device orientation change
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Function to close map selection menu when clicking outside
  useEffect(() => {
    // Only add event listener if the component is mounted and the menu might be open
    if (isOpen) {
      const handleClickOutside = () => {
        if (openMapMenu) {
          setOpenMapMenu(null);
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
    return undefined;
  }, [openMapMenu, isOpen]);

  // Generate a shareable link for the transfer
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const generateShareLink = async () => {
    if (!transfer) return;
    
    try {
      setIsGeneratingLink(true);
      setShareError('');
      // Use the Salesforce ID directly instead of the frontend ID
      // This avoids the need to search for the record on the backend
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      if (!transfer.salesforceId) {
        console.error('No Salesforce ID available for this transfer');
        setShareError('Cannot generate share link: Missing required data.');
        setIsGeneratingLink(false);
        return;
      }
      
      console.debug('Generating share link using Salesforce ID:', transfer.salesforceId);
      
      // Use the full API_BASE_URL to ensure the request goes to the correct backend
      // Applying rule: Always add debug logs & comments in the code for easier debug & readability
      console.debug('Using API base URL:', API_BASE_URL);
      
      // Check if we have a valid authentication token
      if (!user?.token) {
        console.error('No valid authentication token available');
        setShareError('Authentication error. Please log in again.');
        setIsGeneratingLink(false);
        return;
      }
      
      console.debug('Using authentication token from context');
      const response = await fetch(`${API_BASE_URL}/transfers/share/${transfer.salesforceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error generating share link:', error);
        setShareError(error.message || 'Failed to generate share link');
        return;
      }
      
      const data = await response.json();
      const fullLink = `${window.location.origin}/shared-transfer?token=${data.token}`;
      console.debug('Share link generated:', fullLink);
      
      setShareLink(fullLink);
    } catch (error) {
      console.error('Error generating share link:', error);
      setShareError('Failed to generate share link. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };
  
  // Copy share link to clipboard with fallbacks for various browsers
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const copyLinkToClipboard = () => {
    try {
      // Clear any previous errors
      setShareError('');
      
      // Main clipboard copy method using the Clipboard API
      const copyWithClipboardAPI = async () => {
        try {
          await navigator.clipboard.writeText(shareLink);
          return true;
        } catch (clipboardError) {
          console.debug('Clipboard API failed, trying fallback:', clipboardError);
          return false;
        }
      };
      
      // Fallback method using document.execCommand (older browsers)
      const copyWithExecCommand = () => {
        try {
          // Create a temporary textarea element
          const textArea = document.createElement('textarea');
          textArea.value = shareLink;
          
          // Make the textarea invisible but accessible for selection
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          // Execute the copy command
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
          return success;
        } catch (execError) {
          console.debug('execCommand clipboard fallback failed:', execError);
          return false;
        }
      };
      
      // Try the main method first, then the fallback if needed
      copyWithClipboardAPI().then(success => {
        if (!success) {
          // If Clipboard API fails, try the fallback
          const fallbackSuccess = copyWithExecCommand();
          
          if (!fallbackSuccess) {
            console.error('All clipboard methods failed');
            setShareError('Failed to copy link to clipboard. Please select and copy the link manually.');
            return;
          }
        }
        
        // If we reach here, copying was successful
        setLinkCopied(true);
        console.debug('Link copied to clipboard:', shareLink);
        
        // Reset the copied state after 3 seconds
        setTimeout(() => {
          setLinkCopied(false);
        }, 3000);
      });
    } catch (error) {
      console.error('Unexpected error during clipboard copy:', error);
      setShareError('Failed to copy link to clipboard. Please select and copy the link manually.');
    }
  };

  // Early return if no transfer
  if (!transfer) return null;
  
  // Generate URLs for different map services
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const getDirectionsUrl = (location: { latitude: number; longitude: number } | undefined, address: string, mapService: 'google' | 'apple' | 'yandex' = 'google'): string => {
    console.debug('Getting directions for:', { location, address, mapService });
    
    // Check if we have valid data to work with
    if (!address && !location) {
      console.warn('No address or coordinates provided for directions');
      return '#'; // Return a harmless URL as fallback
    }
    
    const hasCoordinates = location?.latitude && location?.longitude;
    const coords = hasCoordinates ? `${location.latitude},${location.longitude}` : '';
    const encodedAddress = encodeURIComponent(address);
    
    switch (mapService) {
      case 'google':
        if (hasCoordinates) {
          return `https://maps.google.com/maps?daddr=${coords}`;
        } else {
          return `https://maps.google.com/maps?daddr=${encodedAddress}`;
        }
      
      case 'apple':
        if (hasCoordinates) {
          return `https://maps.apple.com/?daddr=${coords}&dirflg=d`;
        } else {
          return `https://maps.apple.com/?daddr=${encodedAddress}&dirflg=d`;
        }
      
      case 'yandex':
        if (hasCoordinates) {
          return `https://yandex.com/maps/?rtext=~${coords}`;
        } else {
          return `https://yandex.com/maps/?text=${encodedAddress}`;
        }
      
      default:
        // Return a fallback URL rather than null to satisfy TypeScript
        return '#';
    }
  };
  
  // Handle opening the map selection menu
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const handleMapIconClick = (e: React.MouseEvent, locationType: 'pickup' | 'dropoff') => {
    e.preventDefault();
    e.stopPropagation();
    
    setOpenMapMenu(prevState => prevState === locationType ? null : locationType);
    console.debug(`Toggle map menu for ${locationType} location`);
  };
  
  // Map selection bottom sheet component
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  // This component is rendered directly in the body to avoid scrolling issues
  // Applying rule: Always add debug logs & comments in the code for easier debug & readability
  const MapSelectionBottomSheet = ({ locationType, location, address }: { locationType: 'pickup' | 'dropoff', location?: { latitude: number; longitude: number }, address: string }) => {
    // Don't render anything if the menu is not open for this location
    if (openMapMenu !== locationType) return null;
    
    // Use React Portal to render the sheet at the document body level to avoid scroll issues
    return (
      <div className="fixed inset-0 z-[9999] isolate" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
        {/* Backdrop overlay - dark overlay that dims the background */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-30"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMapMenu(null);
          }}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        {/* Bottom sheet - the selectable map options menu */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg p-4"
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '80vh', overflowY: 'auto' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside menu
        >
          {/* Handle for pull-down gesture */}
          <div className="flex justify-center mb-4">
            <div className="h-1 w-16 bg-gray-300 rounded-full"></div>
          </div>
          
          <h3 className="text-lg font-semibold text-center mb-4">
            Open with Map
          </h3>
          
          <div className="grid grid-cols-3 gap-4 pb-6">
            {/* Google Maps */}
            <a
              href={getDirectionsUrl(location, address, 'google')}
              className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                console.debug('Opening Google Maps directions');
                setOpenMapMenu(null);
              }}
            >
              <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow mb-2 overflow-hidden">
                {/* Google Maps icon */}
                <img 
                  src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5Mi4zIDEzMi4zIj48cGF0aCBmaWxsPSIjMWE3M2U4IiBkPSJNNjAuMiAyLjJDNTUuOC44IDUxIDAgNDYuMSAwIDMyIDAgMTkuMyA2LjQgMTAuOCAxNi41bDIxLjggMTguM0w2MC4yIDIuMnoiLz48cGF0aCBmaWxsPSIjZWE0MzM1IiBkPSJNMTAuOCAxNi41QzQuMSAyNC41IDAgMzQuOSAwIDQ2LjFjMCA4LjcgMS43IDE1LjcgNC42IDIybDI4LTMzLjMtMjEuOC0xOC4zeiIvPjxwYXRoIGZpbGw9IiM0Mjg1ZjQiIGQ9Ik00Ni4yIDI4LjVjOS44IDAgMTcuNyA3LjkgMTcuNyAxNy43IDAgNC4zLTEuNiA4LjMtNC4yIDExLjQgMCAwIDEzLjktMTYuNiAyNy41LTMyLjctNS42LTEwLjgtMTUuMy0xOS0yNy0yMi43TDMyLjYgMzQuOGMzLjMtMy44IDguMS02LjMgMTMuNi02LjMiLz48cGF0aCBmaWxsPSIjZmJiYzA0IiBkPSJNNDYuMiA2My44Yy05LjggMC0xNy43LTcuOS0xNy43LTE3LjcgMC00LjMgMS41LTguMyA0LjEtMTEuM2wtMjggMzMuM2M0LjggMTAuNiAxMi44IDE5LjIgMjEgMjkuOWwzNC4xLTQwLjVjLTMuMyAzLjktOC4xIDYuMy0xMy41IDYuMyIvPjxwYXRoIGZpbGw9IiMzNGE4NTMiIGQ9Ik01OS4xIDEwOS4yYzE1LjQtMjQuMSAzMy4zLTM1IDMzLjMtNjMgMC03LjctMS45LTE0LjktNS4yLTIxLjNMMjUuNiA5OGMyLjYgMy40IDUuMyA3LjMgNy45IDExLjMgOS40IDE0LjUgNi44IDIzLjEgMTIuOCAyMy4xczMuNC04LjcgMTIuOC0yMy4yIi8+PC9zdmc+" 
                  alt="Google Maps" 
                  className="h-13 w-9 object-cover" 
                />
              </div>
              <span className="text-sm font-medium">Google Maps</span>
            </a>
            
            {/* Apple Maps */}
            <a
              href={getDirectionsUrl(location, address, 'apple')}
              className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                console.debug('Opening Apple Maps directions');
                setOpenMapMenu(null);
              }}
            >
              <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow mb-2">
              <img 
                  src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB3aWR0aD0iNjYuMTQ1ODM2bW0iCiAgIGhlaWdodD0iNjYuMTQ1ODM2bW0iCiAgIHZpZXdCb3g9IjAgMCA2Ni4xNDU4MzYgNjYuMTQ1ODM2IgogICB2ZXJzaW9uPSIxLjEiCiAgIGlkPSJzdmc4IgogICBpbmtzY2FwZTp2ZXJzaW9uPSIwLjkyLjIgKDVjM2U4MGQsIDIwMTctMDgtMDYpIgogICBzb2RpcG9kaTpkb2NuYW1lPSJBcHBsZU1hcHMgbG9nby5zdmciPgogIDx0aXRsZQogICAgIGlkPSJ0aXRsZTkwNyI+aU1lc3NhZ2UgIGxvZ288L3RpdGxlPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMyIiAvPgogIDxzb2RpcG9kaTpuYW1lZHZpZXcKICAgICBpZD0iYmFzZSIKICAgICBwYWdlY29sb3I9IiNmZmZmZmYiCiAgICAgYm9yZGVyY29sb3I9IiM2NjY2NjYiCiAgICAgYm9yZGVyb3BhY2l0eT0iMS4wIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwLjAiCiAgICAgaW5rc2NhcGU6cGFnZXNoYWRvdz0iMiIKICAgICBpbmtzY2FwZTp6b29tPSIxIgogICAgIGlua3NjYXBlOmN4PSIzNzMuNzY2NzMiCiAgICAgaW5rc2NhcGU6Y3k9IjE4MC40NzQ4NiIKICAgICBpbmtzY2FwZTpkb2N1bWVudC11bml0cz0icHgiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIxIgogICAgIHNob3dncmlkPSJmYWxzZSIKICAgICBpbmtzY2FwZTpzbmFwLW9iamVjdC1taWRwb2ludHM9ImZhbHNlIgogICAgIHNob3dndWlkZXM9InRydWUiCiAgICAgaW5rc2NhcGU6Z3VpZGUtYmJveD0idHJ1ZSIKICAgICBpbmtzY2FwZTpzbmFwLWludGVyc2VjdGlvbi1wYXRocz0iZmFsc2UiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTIwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjEwMTciCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjEzNTgiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9Ii04IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjEiCiAgICAgZml0LW1hcmdpbi10b3A9IjAiCiAgICAgZml0LW1hcmdpbi1sZWZ0PSIwIgogICAgIGZpdC1tYXJnaW4tcmlnaHQ9IjAiCiAgICAgZml0LW1hcmdpbi1ib3R0b209IjAiCiAgICAgaW5rc2NhcGU6b2JqZWN0LW5vZGVzPSJmYWxzZSIgLz4KICA8bWV0YWRhdGEKICAgICBpZD0ibWV0YWRhdGE1Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT5pTWVzc2FnZSAgbG9nbzwvZGM6dGl0bGU+CiAgICAgICAgPGRjOmRhdGU+MDIvMDQvMjAxODwvZGM6ZGF0ZT4KICAgICAgICA8ZGM6Y3JlYXRvcj4KICAgICAgICAgIDxjYzpBZ2VudD4KICAgICAgICAgICAgPGRjOnRpdGxlPkFwcGxlLCBJbmMuPC9kYzp0aXRsZT4KICAgICAgICAgIDwvY2M6QWdlbnQ+CiAgICAgICAgPC9kYzpjcmVhdG9yPgogICAgICAgIDxkYzpwdWJsaXNoZXI+CiAgICAgICAgICA8Y2M6QWdlbnQ+CiAgICAgICAgICAgIDxkYzp0aXRsZT5DTWV0YWxDb3JlPC9kYzp0aXRsZT4KICAgICAgICAgIDwvY2M6QWdlbnQ+CiAgICAgICAgPC9kYzpwdWJsaXNoZXI+CiAgICAgICAgPGRjOnNvdXJjZT5odHRwczovL3VzZWxlc3NkZXNpcmVzLmRldmlhbnRhcnQuY29tL2FydC9pT1MtMTEtTWFwcy1BcHAtSWNvbi1MQVJHRS1QTkctNjk4OTY2OTg2PC9kYzpzb3VyY2U+CiAgICAgIDwvY2M6V29yaz4KICAgIDwvcmRmOlJERj4KICA8L21ldGFkYXRhPgogIDxnCiAgICAgaW5rc2NhcGU6bGFiZWw9IkNhcGEgMSIKICAgICBpbmtzY2FwZTpncm91cG1vZGU9ImxheWVyIgogICAgIGlkPSJsYXllcjEiCiAgICAgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTI4NC4xOTg2LC0xNDMuMjI2MzYpIj4KICAgIDxnCiAgICAgICBpZD0iZzc0MjMiPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NjYiCiAgICAgICAgIGQ9Im0gMzA3LjY4MDM0LDE4NS45NTQ1IHYgMjMuNDE3NjkgaCAyOC4wOTYzOSBjIDEuNDUyNTMsMCAyLjg1MTc1LC0wLjIxNDk4IDQuMTczMzcsLTAuNjA3NzEgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNlNGUxZGE7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDY4IgogICAgICAgICBkPSJtIDI4NC4xOTg2NSwxNjkuMzU2NTUgdiAyNS40NDgwNiBjIDAsNi4zNDUzMiA0LjAxNzc0LDExLjcxNTU2IDkuNjU3MjYsMTMuNzIyNjcgdiAtMzIuMzQ0MjcgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNmZmNjZDU7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDg2IgogICAgICAgICBkPSJtIDI5My44NTU5MSwxNDQuMDcxMjcgYyAtNC4xMTA0MiwxLjQ2MjkgLTcuMzU3MzgsNC43MTMzMSAtOC44MTcsOC44MjQ3OCBsIDguODE3LDYuMjMyMTggeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNlNGUxZGE7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNTA2IgogICAgICAgICBkPSJtIDMwNy42ODAzNCwxNDMuMjI2MzYgdiAyNS42NzM4OCBsIDQyLjEzODM5LDI5Ljc4NTc4IGMgMC4zMzk1NCwtMS4yMzUyNCAwLjUyNTU0LC0yLjUzNTMzIDAuNTI1NTQsLTMuODgxNDEgdiAtMTQuNTk2NTMgYyAtNy45NDQ1MSwtMC4wMSAtMTMuOTI5NjgsLTIuMjI5NjUgLTE4LjE3ODE2LC00LjY1MzQ2IC0yLjEyODk3LC0xLjIxNDYgLTMuODI0NTQsLTIuNDc5NjMgLTUuMTE5MDQsLTMuNTM1MTkgLTEuMjk0NTIsLTEuMDU1NTYgLTIuMjMzNTUsLTEuOTI1OTkgLTIuNjQ2ODYsLTIuMjI4MjggLTIuNjI2MzUsLTEuOTIwODggLTUuMjI2ODgsLTUuNzAwOTIgLTcuMjc0OTgsLTEwLjQwMjQ3IC0yLjA0ODExLC00LjcwMTU0IC0zLjQ5NDM3LC0xMC4zMjA5NSAtMy40OTQzNywtMTUuODgxMiAwLC0wLjA5NDUgMC4wMDQsLTAuMTg3MjIgMC4wMDUsLTAuMjgxMTIgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiM5ZGRmN2I7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNmY2FiMWE7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuNTQ3OTY0Mzk7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSAyODUuNDEwMTEsMTUxLjk1ODY0IGMgLTAuNzc3NDUsMS43ODUzNyAtMS4yMTEzLDMuNzU3MjcgLTEuMjExMyw1LjgzNTMxIHYgMTIuNzYyNTIgbCA1NC41MDA5LDM4LjUyNDI3IGMgNS43Mzg2MiwtMS4xNTk5OCAxMC4yMzExNiwtNS42NzIyNSAxMS4zNjUxNSwtMTEuNDIwNDkgeiIKICAgICAgICAgaWQ9InBhdGgxMjk0IiAvPgogICAgICA8cGF0aAogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICBzdHlsZT0ib3BhY2l0eToxO2ZpbGw6I2ZmZDYzNDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC40ODAzNTk5MTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBkPSJtIDI4NS4wMzkwNywxNTIuODk2MDUgYyAtMC41NDI4MiwxLjUyOTc2IC0wLjg0MDI2LDMuMTc3NDUgLTAuODQwMjYsNC44OTc5IHYgMTEuNTYyNiBsIDU1Ljc1MzUyLDM5LjQwOTQ4IGMgNC43OTY5OSwtMS40MjM3NiA4LjU0MjI2LC01LjIzOTU3IDkuODY4NjIsLTEwLjA3ODQ2IHoiCiAgICAgICAgIGlkPSJwYXRoMTI5MiIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4xMjU7ZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDowLjYxNjE1Mzg0O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGQ9Im0gMjk4Ljc2NjM1LDE0My4yMjYzNiBjIC0yLjEzODAxLDAgLTQuMTYzMTIsMC40NjAxMyAtNS45ODg3NiwxLjI4MDU0IHYgNjMuNTg0NzUgYyAxLjgyNTY0LDAuODIwNDEgMy44NTA3NSwxLjI4MDU0IDUuOTg4NzYsMS4yODA1NCBoIDkuOTkyNjQgdiAtNjYuMTQ1ODMgeiIKICAgICAgICAgaWQ9InBhdGgxMjg4IiAvPgogICAgICA8cGF0aAogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICBzdHlsZT0ib3BhY2l0eToxO2ZpbGw6I2ZmZmZmZjtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC41MzMwMDUwNjtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBkPSJtIDI5OC43NjYzNSwxNDMuMjI2MzYgYyAtMS43MjUwNSwwIC0zLjM3NzA4LDAuMjk4NzkgLTQuOTEwMjgsMC44NDQzOSB2IDY0LjQ1NzA1IGMgMS41MzMyLDAuNTQ1NiAzLjE4NTIzLDAuODQ0MzkgNC45MTAyOCwwLjg0NDM5IGggOC45MTQxNiB2IC02Ni4xNDU4MyB6IgogICAgICAgICBpZD0icGF0aDEyOTAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtdmFyaWFudDpub3JtYWw7Zm9udC13ZWlnaHQ6bm9ybWFsO2ZvbnQtc3RyZXRjaDpub3JtYWw7Zm9udC1zaXplOm1lZGl1bTtsaW5lLWhlaWdodDpub3JtYWw7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjtmb250LXZhcmlhbnQtbGlnYXR1cmVzOm5vcm1hbDtmb250LXZhcmlhbnQtcG9zaXRpb246bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWFsdGVybmF0ZXM6bm9ybWFsO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbjpub25lO3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC1kZWNvcmF0aW9uLXN0eWxlOnNvbGlkO3RleHQtZGVjb3JhdGlvbi1jb2xvcjojMDAwMDAwO2xldHRlci1zcGFjaW5nOm5vcm1hbDt3b3JkLXNwYWNpbmc6bm9ybWFsO3RleHQtdHJhbnNmb3JtOm5vbmU7d3JpdGluZy1tb2RlOmxyLXRiO2RpcmVjdGlvbjpsdHI7dGV4dC1vcmllbnRhdGlvbjptaXhlZDtkb21pbmFudC1iYXNlbGluZTphdXRvO2Jhc2VsaW5lLXNoaWZ0OmJhc2VsaW5lO3RleHQtYW5jaG9yOnN0YXJ0O3doaXRlLXNwYWNlOm5vcm1hbDtzaGFwZS1wYWRkaW5nOjA7Y2xpcC1ydWxlOm5vbnplcm87ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTt2aXNpYmlsaXR5OnZpc2libGU7b3BhY2l0eToxO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbDtjb2xvci1pbnRlcnBvbGF0aW9uOnNSR0I7Y29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzOmxpbmVhclJHQjtzb2xpZC1jb2xvcjojMDAwMDAwO3NvbGlkLW9wYWNpdHk6MTt2ZWN0b3ItZWZmZWN0Om5vbmU7ZmlsbDojOTBjMzZjO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoyLjAyODk5Njk0O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGw7Y29sb3ItcmVuZGVyaW5nOmF1dG87aW1hZ2UtcmVuZGVyaW5nOmF1dG87c2hhcGUtcmVuZGVyaW5nOmF1dG87dGV4dC1yZW5kZXJpbmc6YXV0bztlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIgogICAgICAgICBkPSJtIDMxMy42MzU2OCwxNDMuMjI2MzYgYyAtMTBlLTQsMC4wOTM5IC0wLjAwNSwwLjE4NjYgLTAuMDA1LDAuMjgxMTIgMCw1LjU2MDI1IDEuNDQ2MjQsMTEuMTc5NjYgMy40OTQzNSwxNS44ODEyIDIuMDQ4MTEsNC43MDE1NSA0LjY0ODY1LDguNDgxNTkgNy4yNzQ5OCwxMC40MDI0NyAwLjQxMzMxLDAuMzAyMjkgMS4zNTIzNiwxLjE3MjcyIDIuNjQ2ODcsMi4yMjgyOCAxLjI5NDUsMS4wNTU1NiAyLjk5MDA5LDIuMzIwNTkgNS4xMTkwNSwzLjUzNTE5IDQuMjQ4NDksMi40MjM4MSAxMC4yMzM2Myw0LjY0MzY0IDE4LjE3ODE1LDQuNjUzNDYgdiAtMi4wMjkzMyBjIC03LjU2ODMzLC0wLjAxIC0xMy4xNzEyNCwtMi4xMDI5OSAtMTcuMTcyNTMsLTQuMzg1NzggLTIuMDA1MzMsLTEuMTQ0MDYgLTMuNjA2NDQsLTIuMzM3MjQgLTQuODQzNjIsLTMuMzQ2MDUgLTEuMjM3MTcsLTEuMDA4ODIgLTIuMDY0ODgsLTEuODA5MDUgLTIuNzI4NTEsLTIuMjk0NDMgLTIuMDg4ODgsLTEuNTI3NzggLTQuNjY0NzEsLTUuMDk3NDMgLTYuNjE1MDgsLTkuNTc0NjEgLTEuOTUwMzcsLTQuNDc3MTkgLTMuMzI0MzMsLTkuODY0NDIgLTMuMzI0MzMsLTE1LjA3MDQgMCwtMC4wOTQ2IDAuMDAzLC0wLjE4NzMxIDAuMDA1LC0wLjI4MTEyIHoiCiAgICAgICAgIGlkPSJwYXRoMTMwMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNmNGVmZWI7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjIuMzI4OTk2NDI7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSAzMTQuNjUwMDgsMTQzLjIyNjM2IGMgLTEwZS00LDAuMDkzNiAtMC4wMDUsMC4xODYyOCAtMC4wMDUsMC4yODA2IDAsMTAuNzY2MjIgNS42MzkxNywyMi4wMTU5NCAxMC4zNTQzOCwyNS40NjQ2IDIuMTUxNDEsMS41NzM1MiA5LjgxNDQyLDEwLjIwMTgxIDI1LjM0NDYyLDEwLjIyMTYgdiAtMjEuMzk5MjEgYyAwLC04LjA3MDU4IC02LjQ5Njk4LC0xNC41Njc1OSAtMTQuNTY3NTMsLTE0LjU2NzU5IHoiCiAgICAgICAgIGlkPSJwYXRoMTMwMiIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9ImNvbG9yOiMwMDAwMDA7Zm9udC1zdHlsZTpub3JtYWw7Zm9udC12YXJpYW50Om5vcm1hbDtmb250LXdlaWdodDpub3JtYWw7Zm9udC1zdHJldGNoOm5vcm1hbDtmb250LXNpemU6bWVkaXVtO2xpbmUtaGVpZ2h0Om5vcm1hbDtmb250LWZhbWlseTpzYW5zLXNlcmlmO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDAwMDA7bGV0dGVyLXNwYWNpbmc6bm9ybWFsO3dvcmQtc3BhY2luZzpub3JtYWw7dGV4dC10cmFuc2Zvcm06bm9uZTt3cml0aW5nLW1vZGU6bHItdGI7ZGlyZWN0aW9uOmx0cjt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO2RvbWluYW50LWJhc2VsaW5lOmF1dG87YmFzZWxpbmUtc2hpZnQ6YmFzZWxpbmU7dGV4dC1hbmNob3I6c3RhcnQ7d2hpdGUtc3BhY2U6bm9ybWFsO3NoYXBlLXBhZGRpbmc6MDtjbGlwLXJ1bGU6bm9uemVybztkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO3Zpc2liaWxpdHk6dmlzaWJsZTtvcGFjaXR5OjE7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO2NvbG9yLWludGVycG9sYXRpb246c1JHQjtjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM6bGluZWFyUkdCO3NvbGlkLWNvbG9yOiMwMDAwMDA7c29saWQtb3BhY2l0eToxO3ZlY3Rvci1lZmZlY3Q6bm9uZTtmaWxsOiM5MGMzNmM7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjIuMzI4OTk2NDI7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbDtjb2xvci1yZW5kZXJpbmc6YXV0bztpbWFnZS1yZW5kZXJpbmc6YXV0bztzaGFwZS1yZW5kZXJpbmc6YXV0bzt0ZXh0LXJlbmRlcmluZzphdXRvO2VuYWJsZS1iYWNrZ3JvdW5kOmFjY3VtdWxhdGUiCiAgICAgICAgIGQ9Im0gMzI4LjYyNjk3LDE0My4yMjYzNiBjIDAuMTc3NjEsNi44ODUxNSAxLjkwMjc0LDExLjY1NTMyIDYuMTQwNjksMTUuNjMxMDkgMi4wMzEwNywxLjkwNTQ0IDQuMDAzMTQsMy41NTYzNSA2Ljg5NjcxLDQuNjczNjEgMi4yMjc3NCwwLjg2MDE3IDQuOTYzNjYsMS4zOTkyNiA4LjY4MDA2LDEuNjAyNDkgdiAtMi4zMzIxNiBjIC0zLjQ3NzE3LC0wLjIwMDM3IC01LjkzMDU2LC0wLjcwNTY1IC03Ljg0MjM4LC0xLjQ0Mzg0IC0yLjUxNDIsLTAuOTcwNzcgLTQuMTY3ODksLTIuMzQ2NTEgLTYuMTQyNzYsLTQuMTk5MjIgLTMuODAxNzMsLTMuNTY2NTUgLTUuMjUxMDIsLTcuNDQ4MTIgLTUuNDA2MzgsLTEzLjkzMTk3IHoiCiAgICAgICAgIGlkPSJwYXRoMTMwNCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiM5ZGRmN2I7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjIuMzI4OTk2NDI7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSAzMjkuNzg5NjksMTQzLjIyNjM2IGMgMC4xNjY5MSw2LjY4NDg1IDEuNzU0MzEsMTEuMDEwMTggNS43NzM3OSwxNC43ODEwMSAzLjUzNTc0LDMuMzE3MDIgNi40ODI5Myw1LjQ5NDU5IDE0Ljc4MDk1LDUuOTYwMzYgdiAtNi4xNzM3OCBjIDAsLTguMDcwNTggLTYuNDk2OTgsLTE0LjU2NzU5IC0xNC41Njc1MywtMTQuNTY3NTkgeiIKICAgICAgICAgaWQ9InBhdGgxMzA2IiAvPgogICAgICA8cGF0aAogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICBzdHlsZT0ib3BhY2l0eToxO2ZpbGw6IzMzOTRlMztmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MC41MzM0NTE5MTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBkPSJtIDI5OC43NjYzNSwxNDMuMjI2MzYgYyAtMC42ODA5OCwwIC0xLjM0OTQyLDAuMDUgLTIuMDA1MDQsMC4xMzk1MyB2IDI4LjMwMDA4IGEgMTEuNzg2NTQ5LDExLjc4NjU4NiAwIDAgMSA0LjA4ODExLC0wLjc0MDUzIDExLjc4NjU0OSwxMS43ODY1ODYgMCAwIDEgMy45MjU4NCwwLjY4ODM0IHYgLTI4LjM4NzQyIHoiCiAgICAgICAgIGlkPSJwYXRoMTMwOCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgaWQ9InBhdGg3MzYzIgogICAgICAgICB0cmFuc2Zvcm09Im1hdHJpeCgwLjI2NDU4MzMzLDAsMCwwLjI2NDU4MzMzLDI4NC4xOTg2LDE0My4yMjYzNikiCiAgICAgICAgIGQ9Im0gMTg4LjE4MTY0LDE1OC41MTk1MyBjIC0wLjcxMTYxLDAuMDIyNyAtMS40MDgwOCwwLjIzNTI5IC0yLjAwNzgxLDAuNjE5MTQgLTYuMzA1NTQsNC4wMjUxMiAtMTMuNTY2NTUsNi4xNjExOCAtMjAuOTgwNDcsNi4xNzE4OCAtNS4zOTI1MiwtMC4wMDQgLTEwLjczMzksLTEuMTM2NzIgLTE1LjY5MzM2LC0zLjMyMjI3IC0xLjkyNTI5LC0wLjg0Nzg2IC00LjIyMjk3LC00LjZlLTQgLTUuMTQ0NTMsMS44OTA2MyAtMy4yMjM0OCw2LjYxNjE3IC00LjkwODc0LDEzLjg3ODc4IC00LjkzMTY0LDIxLjIzODI4IHYgMC4wMTM3IGMgMC4wMDQsMjYuOTE5NDIgMjEuOTAzOTYsNDguODI0MjIgNDguODI0MjIsNDguODI0MjIgMjYuOTIyNzQsMCA0OC44MzIwMywtMjEuOTA3MjYgNDguODMyMDMsLTQ4LjgzMDA4IGEgMS45NzcxOTQ2LDEuOTc3MTk0NiAwIDAgMCAwLC0wLjAwOCBjIC0wLjAxMTMsLTcuMzc1MTUgLTEuNjk2NDksLTE0LjY1MjM2IC00LjkyMzgzLC0yMS4yODMyMSAtMC45MjMxNSwtMS44OTM3MyAtMy4yMzM5NiwtMi43MzQyIC01LjE2MDE2LC0xLjg4MDg2IC00Ljk1MjIsMi4xOTY4OSAtMTAuMjgxNjYsMy4zMzkyMSAtMTUuNjcxODcsMy4zNTc0MyAtNy4zODIwNiwtMC4wMzAyIC0xNC42MTIzLC0yLjE2MjExIC0yMC44OTA2MywtNi4xNjk5MyAtMC4zMzQ0OCwtMC4yMTM5MiAtMC43NDQzMywtMC4yMDU4NSAtMS4xMjMwNCwtMC4zMTA1NCBhIDEuOTc3MTk0NiwxLjk3NzE5NDYgMCAwIDAgLTEuMTI4OTEsLTAuMzEwNTUgeiIKICAgICAgICAgc3R5bGU9ImNvbG9yOiMwMDAwMDA7Zm9udC1zdHlsZTpub3JtYWw7Zm9udC12YXJpYW50Om5vcm1hbDtmb250LXdlaWdodDpub3JtYWw7Zm9udC1zdHJldGNoOm5vcm1hbDtmb250LXNpemU6bWVkaXVtO2xpbmUtaGVpZ2h0Om5vcm1hbDtmb250LWZhbWlseTpzYW5zLXNlcmlmO2ZvbnQtdmFyaWFudC1saWdhdHVyZXM6bm9ybWFsO2ZvbnQtdmFyaWFudC1wb3NpdGlvbjpub3JtYWw7Zm9udC12YXJpYW50LWNhcHM6bm9ybWFsO2ZvbnQtdmFyaWFudC1udW1lcmljOm5vcm1hbDtmb250LXZhcmlhbnQtYWx0ZXJuYXRlczpub3JtYWw7Zm9udC1mZWF0dXJlLXNldHRpbmdzOm5vcm1hbDt0ZXh0LWluZGVudDowO3RleHQtYWxpZ246c3RhcnQ7dGV4dC1kZWNvcmF0aW9uOm5vbmU7dGV4dC1kZWNvcmF0aW9uLWxpbmU6bm9uZTt0ZXh0LWRlY29yYXRpb24tc3R5bGU6c29saWQ7dGV4dC1kZWNvcmF0aW9uLWNvbG9yOiMwMDAwMDA7bGV0dGVyLXNwYWNpbmc6bm9ybWFsO3dvcmQtc3BhY2luZzpub3JtYWw7dGV4dC10cmFuc2Zvcm06bm9uZTt3cml0aW5nLW1vZGU6bHItdGI7ZGlyZWN0aW9uOmx0cjt0ZXh0LW9yaWVudGF0aW9uOm1peGVkO2RvbWluYW50LWJhc2VsaW5lOmF1dG87YmFzZWxpbmUtc2hpZnQ6YmFzZWxpbmU7dGV4dC1hbmNob3I6c3RhcnQ7d2hpdGUtc3BhY2U6bm9ybWFsO3NoYXBlLXBhZGRpbmc6MDtjbGlwLXJ1bGU6bm9uemVybztkaXNwbGF5OmlubGluZTtvdmVyZmxvdzp2aXNpYmxlO3Zpc2liaWxpdHk6dmlzaWJsZTtvcGFjaXR5OjE7aXNvbGF0aW9uOmF1dG87bWl4LWJsZW5kLW1vZGU6bm9ybWFsO2NvbG9yLWludGVycG9sYXRpb246c1JHQjtjb2xvci1pbnRlcnBvbGF0aW9uLWZpbHRlcnM6bGluZWFyUkdCO3NvbGlkLWNvbG9yOiMwMDAwMDA7c29saWQtb3BhY2l0eToxO3ZlY3Rvci1lZmZlY3Q6bm9uZTtmaWxsOiMwMDc4ZDk7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjMuOTUzOTkzODtzdHJva2UtbGluZWNhcDpyb3VuZDtzdHJva2UtbGluZWpvaW46cm91bmQ7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGw7Y29sb3ItcmVuZGVyaW5nOmF1dG87aW1hZ2UtcmVuZGVyaW5nOmF1dG87c2hhcGUtcmVuZGVyaW5nOmF1dG87dGV4dC1yZW5kZXJpbmc6YXV0bztlbmFibGUtYmFja2dyb3VuZDphY2N1bXVsYXRlIiAvPgogICAgICA8cGF0aAogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICBpZD0icGF0aDczNzAiCiAgICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDAuMjY0NTgzMzMsMCwwLDAuMjY0NTgzMzMsMjg0LjE5ODYsMTQzLjIyNjM2KSIKICAgICAgICAgZD0ibSAxODguMjQyMTksMTYwLjQ5NjA5IGEgMS45NzcxOTE1LDEuOTc3MTk3NyAwIDAgMCAtMS4wMDE5NiwwLjMxMDU1IGMgLTYuNjIxMzksNC4yMjY3MiAtMTQuMjU2NzksNi40Njg3MyAtMjIuMDUwNzgsNi40Nzg1MiAtNS42NjcyNSwtMC4wMDQgLTExLjI3NTUsLTEuMTg4OTIgLTE2LjQ4NDM3LC0zLjQ4NDM4IGEgMS45NzcxOTE1LDEuOTc3MTk3NyAwIDAgMCAtMi41NzQyMiwwLjk0MzM2IGMgLTMuMDkyOTgsNi4zNDgyOCAtNC43MTA0NiwxMy4zMTMzNyAtNC43MzI0MiwyMC4zNzUgYSAxLjk3NzE5MTUsMS45NzcxOTc3IDAgMCAwIDAsMC4wMDggYyAwLDI1Ljg1MjI0IDIwLjk5OTQsNDYuODUxNTcgNDYuODUxNTYsNDYuODUxNTcgMjUuODUyMTYsMCA0Ni44NTE1NiwtMjAuOTk5MzMgNDYuODUxNTYsLTQ2Ljg1MTU3IGEgMS45NzcxOTE1LDEuOTc3MTk3NyAwIDAgMCAwLC0wLjAwNCBjIC0wLjAxMTMsLTcuMDc2MTUgLTEuNjI3ODEsLTE0LjA1NzMyIC00LjcyNDYxLC0yMC40MTk5MyBhIDEuOTc3MTkxNSwxLjk3NzE5NzcgMCAwIDAgLTIuNTc4MTIsLTAuOTQxNCBjIC01LjIwNTk2LDIuMzA5NDQgLTEwLjgxNDQ0LDMuNTA4MzQgLTE2LjQ4NDM4LDMuNTI1MzkgLTcuNzU3NzQsLTAuMDMwMiAtMTUuMzU0NjEsLTIuMjcxMyAtMjEuOTQ1MzEsLTYuNDc4NTIgYSAxLjk3NzE5MTUsMS45NzcxOTc3IDAgMCAwIC0xLjEyNjk1LC0wLjMxMDU0IHoiCiAgICAgICAgIHN0eWxlPSJjb2xvcjojMDAwMDAwO2ZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtdmFyaWFudDpub3JtYWw7Zm9udC13ZWlnaHQ6bm9ybWFsO2ZvbnQtc3RyZXRjaDpub3JtYWw7Zm9udC1zaXplOm1lZGl1bTtsaW5lLWhlaWdodDpub3JtYWw7Zm9udC1mYW1pbHk6c2Fucy1zZXJpZjtmb250LXZhcmlhbnQtbGlnYXR1cmVzOm5vcm1hbDtmb250LXZhcmlhbnQtcG9zaXRpb246bm9ybWFsO2ZvbnQtdmFyaWFudC1jYXBzOm5vcm1hbDtmb250LXZhcmlhbnQtbnVtZXJpYzpub3JtYWw7Zm9udC12YXJpYW50LWFsdGVybmF0ZXM6bm9ybWFsO2ZvbnQtZmVhdHVyZS1zZXR0aW5nczpub3JtYWw7dGV4dC1pbmRlbnQ6MDt0ZXh0LWFsaWduOnN0YXJ0O3RleHQtZGVjb3JhdGlvbjpub25lO3RleHQtZGVjb3JhdGlvbi1saW5lOm5vbmU7dGV4dC1kZWNvcmF0aW9uLXN0eWxlOnNvbGlkO3RleHQtZGVjb3JhdGlvbi1jb2xvcjojMDAwMDAwO2xldHRlci1zcGFjaW5nOm5vcm1hbDt3b3JkLXNwYWNpbmc6bm9ybWFsO3RleHQtdHJhbnNmb3JtOm5vbmU7d3JpdGluZy1tb2RlOmxyLXRiO2RpcmVjdGlvbjpsdHI7dGV4dC1vcmllbnRhdGlvbjptaXhlZDtkb21pbmFudC1iYXNlbGluZTphdXRvO2Jhc2VsaW5lLXNoaWZ0OmJhc2VsaW5lO3RleHQtYW5jaG9yOnN0YXJ0O3doaXRlLXNwYWNlOm5vcm1hbDtzaGFwZS1wYWRkaW5nOjA7Y2xpcC1ydWxlOm5vbnplcm87ZGlzcGxheTppbmxpbmU7b3ZlcmZsb3c6dmlzaWJsZTt2aXNpYmlsaXR5OnZpc2libGU7b3BhY2l0eToxO2lzb2xhdGlvbjphdXRvO21peC1ibGVuZC1tb2RlOm5vcm1hbDtjb2xvci1pbnRlcnBvbGF0aW9uOnNSR0I7Y29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzOmxpbmVhclJHQjtzb2xpZC1jb2xvcjojMDAwMDAwO3NvbGlkLW9wYWNpdHk6MTt2ZWN0b3ItZWZmZWN0Om5vbmU7ZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDozLjk1Mzk5Mzg7c3Ryb2tlLWxpbmVjYXA6cm91bmQ7c3Ryb2tlLWxpbmVqb2luOnJvdW5kO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsO2NvbG9yLXJlbmRlcmluZzphdXRvO2ltYWdlLXJlbmRlcmluZzphdXRvO3NoYXBlLXJlbmRlcmluZzphdXRvO3RleHQtcmVuZGVyaW5nOmF1dG87ZW5hYmxlLWJhY2tncm91bmQ6YWNjdW11bGF0ZSIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiNkZTFjMjU7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzkwMDk1MjM7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgZD0ibSAzMzQuMDIwOTMsMTg2LjIxMzkyIGEgMTEuNTkwMTU4LDExLjg3MzE3OCAwIDAgMSAtNi4xMTY0LDEuNzk2MjcgMTEuNTkwMTU4LDExLjg3MzE3OCAwIDAgMSAtNC41NzE3OSwtMC45NjYzNSAxMS44NzMxNDEsMTEuODczMTc4IDAgMCAwIC0xLjAzNzY3LDMuMjc3ODQgaCAyMy40MTYwOCBhIDExLjg3MzE0MSwxMS44NzMxNzggMCAwIDAgLTEuMDI4ODgsLTMuMjg5MjEgMTEuNTkwMTU4LDExLjg3MzE3OCAwIDAgMSAtNC41NzMzNiwwLjk3NzcyIDExLjU5MDE1OCwxMS44NzMxNzggMCAwIDEgLTYuMDg3OTgsLTEuNzk2MjcgeiIKICAgICAgICAgaWQ9InBhdGgxMzEyIiAvPgogICAgICA8cGF0aAogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICBzdHlsZT0ib3BhY2l0eToxO2ZpbGw6IzAwNzhkOTtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zOTAwOTUyMztzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBkPSJtIDMyMi4xOTg0NCwxOTEuMTQ4NSBhIDExLjg3MzE0MSwxMS44NzMxNzggMCAwIDAgLTAuMDY1MSwxLjA1ODg1IDExLjg3MzE0MSwxMS44NzMxNzggMCAwIDAgMTEuODczMTMsMTEuODczMTggMTEuODczMTQxLDExLjg3MzE3OCAwIDAgMCAxMS44NzMxNSwtMTEuODczMTggMTEuODczMTQxLDExLjg3MzE3OCAwIDAgMCAtMC4wNTQ4LC0xLjA1ODg1IHoiCiAgICAgICAgIGlkPSJwYXRoMTMxNCIgLz4KICAgICAgPGcKICAgICAgICAgaWQ9ImZsb3dSb290MTMyNCIKICAgICAgICAgc3R5bGU9ImZvbnQtc3R5bGU6bm9ybWFsO2ZvbnQtd2VpZ2h0Om5vcm1hbDtmb250LXNpemU6NDBweDtsaW5lLWhlaWdodDoxLjI1O2ZvbnQtZmFtaWx5OnNhbnMtc2VyaWY7bGV0dGVyLXNwYWNpbmc6MHB4O3dvcmQtc3BhY2luZzowcHg7b3BhY2l0eToxO2ZpbGw6I2ZmZmZmZjtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZSIKICAgICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC4yNTQyMTYyNiwwLDAsMC4yMjcyODAyNiwyODMuNDk4NTQsMTQ3Ljc1NzgzKSIKICAgICAgICAgYXJpYS1sYWJlbD0iMjgwIj4KICAgICAgICA8cGF0aAogICAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgICAgICAgaWQ9InBhdGg1Njg3IgogICAgICAgICAgIHN0eWxlPSJmb250LXN0eWxlOm5vcm1hbDtmb250LXZhcmlhbnQ6bm9ybWFsO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zdHJldGNoOm5vcm1hbDtmb250LWZhbWlseTpBcmlhbDstaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOidBcmlhbCBCb2xkJztmaWxsOiNmZmZmZmYiCiAgICAgICAgICAgZD0ibSAxODUuMjM0MzcsMjIxLjE4MjUyIHYgNS4wOTc2NiBoIC0xOS4yMzgyOCBxIDAuMzEyNSwtMi44OTA2MyAxLjg3NSwtNS40Njg3NSAxLjU2MjUsLTIuNTk3NjYgNi4xNzE4OCwtNi44NzUgMy43MTA5NCwtMy40NTcwMyA0LjU1MDc4LC00LjY4NzUgMS4xMzI4MSwtMS42OTkyMiAxLjEzMjgxLC0zLjM1OTM4IDAsLTEuODM1OTQgLTAuOTk2MDksLTIuODEyNSAtMC45NzY1NiwtMC45OTYwOSAtMi43MTQ4NSwtMC45OTYwOSAtMS43MTg3NSwwIC0yLjczNDM3LDEuMDM1MTUgLTEuMDE1NjMsMS4wMzUxNiAtMS4xNzE4OCwzLjQzNzUgbCAtNS40Njg3NSwtMC41NDY4NyBxIDAuNDg4MjksLTQuNTMxMjUgMy4wNjY0MSwtNi41MDM5MSAyLjU3ODEzLC0xLjk3MjY1IDYuNDQ1MzEsLTEuOTcyNjUgNC4yMzgyOCwwIDYuNjYwMTYsMi4yODUxNSAyLjQyMTg3LDIuMjg1MTYgMi40MjE4Nyw1LjY4MzYgMCwxLjkzMzU5IC0wLjcwMzEyLDMuNjkxNCAtMC42ODM1OSwxLjczODI4IC0yLjE4NzUsMy42NTIzNSAtMC45OTYwOSwxLjI2OTUzIC0zLjU5Mzc1LDMuNjUyMzQgLTIuNTk3NjYsMi4zODI4MSAtMy4zMDA3OCwzLjE2NDA2IC0wLjY4MzYsMC43ODEyNSAtMS4xMTMyOCwxLjUyMzQ0IHoiIC8+CiAgICAgICAgPHBhdGgKICAgICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIgogICAgICAgICAgIGlkPSJwYXRoNTY4OSIKICAgICAgICAgICBzdHlsZT0iZm9udC1zdHlsZTpub3JtYWw7Zm9udC12YXJpYW50Om5vcm1hbDtmb250LXdlaWdodDpib2xkO2ZvbnQtc3RyZXRjaDpub3JtYWw7Zm9udC1mYW1pbHk6QXJpYWw7LWlua3NjYXBlLWZvbnQtc3BlY2lmaWNhdGlvbjonQXJpYWwgQm9sZCc7ZmlsbDojZmZmZmZmIgogICAgICAgICAgIGQ9Im0gMTkzLjY3MTg3LDIxMC44MzA5NiBxIC0yLjEyODksLTAuODk4NDQgLTMuMTA1NDYsLTIuNDYwOTQgLTAuOTU3MDQsLTEuNTgyMDMgLTAuOTU3MDQsLTMuNDU3MDMgMCwtMy4yMDMxMyAyLjIyNjU3LC01LjI5Mjk3IDIuMjQ2MDksLTIuMDg5ODQgNi4zNjcxOCwtMi4wODk4NCA0LjA4MjA0LDAgNi4zMjgxMywyLjA4OTg0IDIuMjY1NjIsMi4wODk4NCAyLjI2NTYyLDUuMjkyOTcgMCwxLjk5MjE5IC0xLjAzNTE1LDMuNTU0NjkgLTEuMDM1MTYsMS41NDI5NyAtMi45MTAxNiwyLjM2MzI4IDIuMzgyODEsMC45NTcwMyAzLjYxMzI4LDIuNzkyOTcgMS4yNSwxLjgzNTkzIDEuMjUsNC4yMzgyOCAwLDMuOTY0ODQgLTIuNTM5MDYsNi40NDUzMSAtMi41MTk1MywyLjQ4MDQ3IC02LjcxODc1LDIuNDgwNDcgLTMuOTA2MjUsMCAtNi41MDM5MSwtMi4wNTA3OCAtMy4wNjY0LC0yLjQyMTg4IC0zLjA2NjQsLTYuNjQwNjMgMCwtMi4zMjQyMiAxLjE1MjM0LC00LjI1NzgxIDEuMTUyMzUsLTEuOTUzMTIgMy42MzI4MSwtMy4wMDc4MSB6IG0gMS4xMzI4MiwtNS41MjczNSBxIDAsMS42NDA2MyAwLjkxNzk3LDIuNTU4NiAwLjkzNzUsMC45MTc5NyAyLjQ4MDQ2LDAuOTE3OTcgMS41NjI1LDAgMi41LC0wLjkxNzk3IDAuOTM3NSwtMC45Mzc1IDAuOTM3NSwtMi41NzgxMyAwLC0xLjU0Mjk3IC0wLjkzNzUsLTIuNDYwOTMgLTAuOTE3OTYsLTAuOTM3NSAtMi40NDE0LC0wLjkzNzUgLTEuNTgyMDMsMCAtMi41MTk1MywwLjkzNzUgLTAuOTM3NSwwLjkzNzUgLTAuOTM3NSwyLjQ4MDQ2IHogbSAtMC41MDc4MiwxMi4yNjU2MyBxIDAsMi4yNjU2MiAxLjE1MjM1LDMuNTM1MTYgMS4xNzE4NywxLjI2OTUzIDIuOTEwMTUsMS4yNjk1MyAxLjY5OTIyLDAgMi44MTI1LC0xLjIxMDk0IDEuMTEzMjksLTEuMjMwNDcgMS4xMTMyOSwtMy41MzUxNiAwLC0yLjAxMTcyIC0xLjEzMjgyLC0zLjIyMjY1IC0xLjEzMjgxLC0xLjIzMDQ3IC0yLjg3MTA5LC0xLjIzMDQ3IC0yLjAxMTcyLDAgLTMuMDA3ODEsMS4zODY3MiAtMC45NzY1NywxLjM4NjcyIC0wLjk3NjU3LDMuMDA3ODEgeiIgLz4KICAgICAgICA8cGF0aAogICAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiCiAgICAgICAgICAgaWQ9InBhdGg1NjkxIgogICAgICAgICAgIHN0eWxlPSJmb250LXN0eWxlOm5vcm1hbDtmb250LXZhcmlhbnQ6bm9ybWFsO2ZvbnQtd2VpZ2h0OmJvbGQ7Zm9udC1zdHJldGNoOm5vcm1hbDtmb250LWZhbWlseTpBcmlhbDstaW5rc2NhcGUtZm9udC1zcGVjaWZpY2F0aW9uOidBcmlhbCBCb2xkJztmaWxsOiNmZmZmZmYiCiAgICAgICAgICAgZD0ibSAyMjAuNTA3ODEsMTk3LjUzMDE4IHEgNC4xNjAxNiwwIDYuNTAzOTEsMi45Njg3NSAyLjc5Mjk3LDMuNTE1NjIgMi43OTI5NywxMS42NjAxNSAwLDguMTI1IC0yLjgxMjUsMTEuNjc5NjkgLTIuMzI0MjIsMi45Mjk2OSAtNi40ODQzOCwyLjkyOTY5IC00LjE3OTY5LDAgLTYuNzM4MjgsLTMuMjAzMTMgLTIuNTU4NTksLTMuMjIyNjUgLTIuNTU4NTksLTExLjQ2NDg0IDAsLTguMDg1OTQgMi44MTI1LC0xMS42NDA2MyAyLjMyNDIyLC0yLjkyOTY4IDYuNDg0MzcsLTIuOTI5NjggeiBtIDAsNC41NTA3OCBxIC0wLjk5NjA5LDAgLTEuNzc3MzQsMC42NDQ1MyAtMC43ODEyNSwwLjYyNSAtMS4yMTA5NCwyLjI2NTYyIC0wLjU2NjQxLDIuMTI4OTEgLTAuNTY2NDEsNy4xNjc5NyAwLDUuMDM5MDcgMC41MDc4Miw2LjkzMzYgMC41MDc4MSwxLjg3NSAxLjI2OTUzLDIuNSAwLjc4MTI1LDAuNjI1IDEuNzc3MzQsMC42MjUgMC45OTYxLDAgMS43NzczNSwtMC42MjUgMC43ODEyNSwtMC42NDQ1MyAxLjIxMDkzLC0yLjI4NTE2IDAuNTY2NDEsLTIuMTA5MzcgMC41NjY0MSwtNy4xNDg0NCAwLC01LjAzOTA2IC0wLjUwNzgxLC02LjkxNDA2IC0wLjUwNzgyLC0xLjg5NDUzIC0xLjI4OTA3LC0yLjUxOTUzIC0wLjc2MTcxLC0wLjY0NDUzIC0xLjc1NzgxLC0wLjY0NDUzIHoiIC8+CiAgICAgIDwvZz4KICAgICAgPGVsbGlwc2UKICAgICAgICAgcnk9IjExLjc4NjU4NiIKICAgICAgICAgcng9IjExLjc4NjU0OSIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MTtmaWxsOiMwMTc5ZGE7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjAuODQzOTg1OTc7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaWQ9ImNpcmNsZTEyOTYiCiAgICAgICAgIGN4PSIzMDAuODQ5NjciCiAgICAgICAgIGN5PSIxODIuNzEyMDUiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIHN0eWxlPSJvcGFjaXR5OjE7ZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDowLjI1MjI5NTk0O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGQ9Im0gMzAwLjc5ODQ5LDE3NS4zOTk2MyBjIC0wLjAwOCw1LjNlLTQgLTAuMDE2MSwwLjAwMyAtMC4wMjQzLDAuMDA0IC0wLjAyMTIsMC4wMDIgLTAuMDQxOSwwLjAwNiAtMC4wNjMsMC4wMTAzIC0wLjAzMDMsMC4wMDYgLTAuMDYwMiwwLjAxMTkgLTAuMDg5NCwwLjAyMTIgLTAuMDA3LDAuMDAyIC0wLjAxMzMsMC4wMDIgLTAuMDE5NiwwLjAwNSAtMC4wMTAzLDAuMDA0IC0wLjAxOTMsMC4wMDkgLTAuMDI5NCwwLjAxMzQgLTAuMDMwMiwwLjAxMTkgLTAuMDU5NCwwLjAyNTIgLTAuMDg3OSwwLjA0MDggLTAuMDE4NSwwLjAxMDEgLTAuMDM1OSwwLjAyMTEgLTAuMDUzMiwwLjAzMjYgLTAuMDIxMiwwLjAxNCAtMC4wNDE0LDAuMDI4NCAtMC4wNjEsMC4wNDQ0IC0wLjAyMDYsMC4wMTY4IC0wLjAzOTgsMC4wMzQ1IC0wLjA1ODQsMC4wNTMyIC0wLjAxNTMsMC4wMTU2IC0wLjAyOTksMC4wMzE2IC0wLjA0MzksMC4wNDg2IC0wLjAxODMsMC4wMjE5IC0wLjAzNDYsMC4wNDQ2IC0wLjA1MDEsMC4wNjgyIC0wLjAxMDksMC4wMTY2IC0wLjAyMTQsMC4wMzMxIC0wLjAzMSwwLjA1MDYgLTAuMDE1MywwLjAyNzcgLTAuMDI4MSwwLjA1NjQgLTAuMDM5OCwwLjA4NTggLTAuMDA0LDAuMDEwNyAtMC4wMTA1LDAuMDE5OSAtMC4wMTQ1LDAuMDMxIGwgLTEuMDc0MzQsMy4xMDg4NiBjIC0wLjAwMywwLjAwNCAtMC4wMDQsMC4wMDggLTAuMDA2LDAuMDEyNCBsIC0wLjgwMzU1LDIuMzI1OTUgLTAuNTQzNjQsMS41NzI1MiB2IDUuMmUtNCBsIC0yLjA4MzA3LDYuMDI5NiBjIC0wLjEyNDUxLDAuMjc0MjIgLTAuMDc4NiwwLjYwNjI3IDAuMTQzNjQsMC44MzcxNiAwLjEyNTMxLDAuMTMwMTYgMC4yODU1MiwwLjIwMjY5IDAuNDUxMTUsMC4yMjM3NiAwLDllLTUgMC4wMDMsNS4yZS00IDAuMDAzLDUuMmUtNCAwLjA0NDEsMC4wMDUgMC4wODgsMC4wMDcgMC4xMzIyOSwwLjAwNSAwLjAxMywtNS4zZS00IDAuMDI1NCwtMC4wMDIgMC4wMzgyLC0wLjAwMyAwLjAzMTgsLTAuMDAzIDAuMDYzMiwtMC4wMDggMC4wOTQ2LC0wLjAxNTUgMC4wMjA0LC0wLjAwNSAwLjA0MDIsLTAuMDEwMyAwLjA2LC0wLjAxNjUgMC4wMjQxLC0wLjAwOCAwLjA0NzUsLTAuMDE2MSAwLjA3MDgsLTAuMDI2NCAwLjAyNjIsLTAuMDExMiAwLjA1MTIsLTAuMDI0MiAwLjA3NiwtMC4wMzgyIDAuMDE0LC0wLjAwOCAwLjAyODIsLTAuMDE2MSAwLjA0MTksLTAuMDI1MyAwLjAzMzcsLTAuMDIyMSAwLjA2NDcsLTAuMDQ3NSAwLjA5NDYsLTAuMDc0OSAwLjAwMywtMC4wMDMgMC4wMDcsLTAuMDA1IDAuMDEwOSwtMC4wMDggbCAwLjA0MjksLTAuMDQwOCB2IC0wLjAwMiBsIDMuOTY3MiwtMy44MTg4OSAzLjk2NzE3LDMuODE4ODkgYyAwLjAwNCwwLjAwNCAwLjAwOCwwLjAwNyAwLjAxMTQsMC4wMTE0IGwgMC4wMzI1LDAuMDMxIGMgMC4wMDMsMC4wMDMgMC4wMDcsMC4wMDUgMC4wMTA5LDAuMDA4IDAuMDI5OSwwLjAyNzQgMC4wNjEsMC4wNTI4IDAuMDk0NiwwLjA3NDkgMC4wMTM4LDAuMDA5IDAuMDI3NywwLjAxNzEgMC4wNDE5LDAuMDI1MyAwLjAyNDYsMC4wMTQxIDAuMDQ5OCwwLjAyNyAwLjA3NiwwLjAzODIgMC4wMjMzLDAuMDEwMiAwLjA0NjgsMC4wMTg2IDAuMDcwOCwwLjAyNjQgMC4wMTk4LDAuMDA2IDAuMDM5NiwwLjAxMTkgMC4wNTk5LDAuMDE2NSAwLjAzMSwwLjAwNyAwLjA2MiwwLjAxMjIgMC4wOTM1LDAuMDE1NSAwLjAxMzIsMTBlLTQgMC4wMjYsMC4wMDMgMC4wMzkzLDAuMDAzIDAuMDQ0MywwLjAwMiAwLjA4ODMsOGUtNCAwLjEzMjI5LC0wLjAwNSAwLC0xZS00IDAuMDAzLC01LjJlLTQgMC4wMDMsLTUuMmUtNCAwLjE2NTYzLC0wLjAyMTEgMC4zMjU4NiwtMC4wOTM2IDAuNDUxMTQsLTAuMjIzNzYgMC4yMjIyOCwtMC4yMzA4OSAwLjI2ODE4LC0wLjU2Mjk0IDAuMTQzNjcsLTAuODM3MTYgbCAtMy40MzA3OSwtOS45Mjg1OSBjIDAsLTAuMDAzIC0wLjAwMywtMC4wMDYgLTAuMDA0LC0wLjAwOSBsIC0xLjA3NTQsLTMuMTExOTYgYyAtMC4wMDQsLTAuMDEyMyAtMC4wMTE1LC0wLjAyMjcgLTAuMDE2NSwtMC4wMzQ2IC0wLjAxMDksLTAuMDI3MiAtMC4wMjI4LC0wLjA1MzggLTAuMDM2NywtMC4wNzk2IC0wLjAxMDMsLTAuMDE4OCAtMC4wMjE0LC0wLjAzNjYgLTAuMDMzMSwtMC4wNTQzIC0wLjAxNTQsLTAuMDIzMSAtMC4wMzEzLC0wLjA0NTMgLTAuMDQ5MSwtMC4wNjY3IC0wLjAxNDgsLTAuMDE3OCAtMC4wMzAzLC0wLjAzNDQgLTAuMDQ2NSwtMC4wNTA2IC0wLjAxNzIsLTAuMDE3NCAtMC4wMzUyLC0wLjAzMzkgLTAuMDU0MywtMC4wNDk2IC0wLjAyMDksLTAuMDE3MiAtMC4wNDI2LC0wLjAzMjcgLTAuMDY1MSwtMC4wNDc1IC0wLjAxNjksLTAuMDExMSAtMC4wMzM3LC0wLjAyMTcgLTAuMDUxNywtMC4wMzE1IC0wLjAyODEsLTAuMDE1NSAtMC4wNTcsLTAuMDI4NSAtMC4wODY4LC0wLjA0MDMgLTAuMDEwMywtMC4wMDQgLTAuMDE5MywtMC4wMTAzIC0wLjAzLC0wLjAxMzkgLTAuMDA3LC0wLjAwMiAtMC4wMTMsLTAuMDAzIC0wLjAxOTYsLTAuMDA1IC0wLjAyOTEsLTAuMDA5IC0wLjA1ODcsLTAuMDE1NiAtMC4wODg5LC0wLjAyMTIgLTAuMDIxMiwtMC4wMDQgLTAuMDQyLC0wLjAwOCAtMC4wNjMsLTAuMDEwMyAtMC4wMjQ5LC0wLjAwMiAtMC4wNTAxLC0wLjAwMyAtMC4wNzU1LC0wLjAwMyAtMC4wMTY5LC0zZS01IC0wLjAzNDMsLTAuMDAzIC0wLjA1MTEsLTAuMDAyIHoiCiAgICAgICAgIGlkPSJwYXRoMTI5OCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNTA0IgogICAgICAgICBkPSJtIDM0OS44MTg3MywxOTguNjg2MDIgYyAtMC4wMTc3LDAuMDY0MiAtMC4wMzUzLDAuMTI4NDQgLTAuMDUzOCwwLjE5MjI0IDAuMDE4NSwtMC4wNjM3IDAuMDM4MywtMC4xMjY2NyAwLjA1NTgsLTAuMTkwNjkgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNTAyIgogICAgICAgICBkPSJtIDM0OS43NjQ5NywxOTguODc4MjYgYyAtMC4wMTksMC4wNjU5IC0wLjAzNzQsMC4xMzE5MyAtMC4wNTc0LDAuMTk3NCAwLjAxOTgsLTAuMDY1NCAwLjAzODMsLTAuMTMxNTYgMC4wNTc0LC0wLjE5NzQgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNTAwIgogICAgICAgICBkPSJtIDM0OS43MDc2MSwxOTkuMDc1NjYgYyAtMC4wNTE5LDAuMTcwMjMgLTAuMTA1NDksMC4zMzk0MyAtMC4xNjMyOCwwLjUwNjk1IDAuMDU3NywtMC4xNjc0NCAwLjExMTU1LC0wLjMzNjc0IDAuMTYzMjgsLTAuNTA2OTUgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDk2IgogICAgICAgICBkPSJtIDI5OC4wNjE4NCwxNDMuMjQ0NDUgYyAtMC4wNzY5LDAuMDA0IC0wLjE1MjkyLDAuMDEwMiAtMC4yMjk0NCwwLjAxNSAwLjA3NjYsLTAuMDA1IDAuMTUyNTMsLTAuMDExMyAwLjIyOTQ0LC0wLjAxNSB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0OTQiCiAgICAgICAgIGQ9Im0gMjk3LjM4MTc5LDE0My4yOTMwMiBjIC0wLjEwNDE3LDAuMDEgLTAuMjA3NTksMC4wMjE3IC0wLjMxMTEsMC4wMzM2IDAuMTAzNDMsLTAuMDExOSAwLjIwNzAxLC0wLjAyMzggMC4zMTExLC0wLjAzMzYgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDkyIgogICAgICAgICBkPSJtIDI5Ni43MDY4OSwxNDMuMzczMTIgYyAtMC4xMDg5NSwwLjAxNTMgLTAuMjE3NDEsMC4wMzE0IC0wLjMyNTU3LDAuMDQ5MSAwLjEwODExLC0wLjAxNzcgMC4yMTY2NywtMC4wMzM3IDAuMzI1NTcsLTAuMDQ5MSB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0OTAiCiAgICAgICAgIGQ9Im0gMjk2LjA0MDc4LDE0My40ODI2OCBjIC0wLjExMzA2LDAuMDIxMiAtMC4yMjU4OCwwLjA0MjggLTAuMzM3OTUsMC4wNjY3IDAuMTExOTcsLTAuMDIzOSAwLjIyNSwtMC4wNDU0IDAuMzM3OTUsLTAuMDY2NyB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0ODgiCiAgICAgICAgIGQ9Im0gMjk1LjQwMjU4LDE0My42MTgwNyBjIC0wLjEyMDY4LDAuMDI4MyAtMC4yNDE3NSwwLjA1NiAtMC4zNjEyMSwwLjA4NzMgMC4xMTk1MSwtMC4wMzE0IDAuMjQwNTEsLTAuMDU4OSAwLjM2MTIxLC0wLjA4NzMgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDg0IgogICAgICAgICBkPSJtIDI4NS4wMzI2OSwxNTIuOTE0NjYgYyAtMC4wNjQsMC4xODExIC0wLjEyNDM4LDAuMzYzOTMgLTAuMTgxMzcsMC41NDgyOCAwLjA1NywtMC4xODQzMSAwLjExNzM5LC0wLjM2NzE5IDAuMTgxMzcsLTAuNTQ4MjggeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDgyIgogICAgICAgICBkPSJtIDI4NC44NDIwMSwxNTMuNDkzOTUgYyAtMC4wNTQyLDAuMTc2ODggLTAuMTA1MzEsMC4zNTUxMyAtMC4xNTI5NiwwLjUzNDg1IDAuMDQ3NywtMC4xNzk2NSAwLjA5ODcsLTAuMzU4MDIgMC4xNTI5NiwtMC41MzQ4NSB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0ODAiCiAgICAgICAgIGQ9Im0gMjg0LjY2OTkyLDE1NC4xMDIxOCBjIC0wLjA0MzIsMC4xNjY0NiAtMC4wODM1LDAuMzM0MDYgLTAuMTIwOTEsMC41MDI4MSAwLjAzNzUsLTAuMTY4NzMgMC4wNzc2LC0wLjMzNjM2IDAuMTIwOTEsLTAuNTAyODEgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDc4IgogICAgICAgICBkPSJtIDI4NC41MjQ3MiwxNTQuNzE0NTUgYyAtMC4wMzMzLDAuMTU1OTcgLTAuMDYzNywwLjMxMjk2IC0wLjA5MiwwLjQ3MDc3IDAuMDI4NCwtMC4xNTc3IDAuMDU4NiwtMC4zMTQ5MSAwLjA5MiwtMC40NzA3NyB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NzYiCiAgICAgICAgIGQ9Im0gMjg0LjQwNzkzLDE1NS4zMjE3NSBjIC0wLjAyNzEsMC4xNTk2MSAtMC4wNTEsMC4zMjAyNCAtMC4wNzI5LDAuNDgxNjIgMC4wMjIsLTAuMTYxMzQgMC4wNDU3LC0wLjMyMjA1IDAuMDcyOSwtMC40ODE2MiB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NzQiCiAgICAgICAgIGQ9Im0gMjg0LjMxODAzLDE1NS45MjYzNiBjIC0wLjAyMDYsMC4xNjE4NyAtMC4wMzc1LDAuMzI0ODMgLTAuMDUyNywwLjQ4ODM0IDAuMDE1MywtMC4xNjM1MSAwLjAzMjEsLTAuMzI2NDggMC4wNTI3LC0wLjQ4ODM0IHoiCiAgICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjM5OTk5OTk7ZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjMzNjM0NTU1O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoMTQ3MiIKICAgICAgICAgZD0ibSAyODQuMjUyMzgsMTU2LjU0NTk2IGMgLTAuMDEzLDAuMTUyNDggLTAuMDIyNSwwLjMwNjExIC0wLjAzMDUsMC40NTk5MiAwLjAwOCwtMC4xNTM4NyAwLjAxNzUsLTAuMzA3MzkgMC4wMzA1LC0wLjQ1OTkyIHoiCiAgICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjM5OTk5OTk7ZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjMzNjM0NTU1O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJwYXRoMTQ3MCIKICAgICAgICAgZD0ibSAyODQuMjEyMDksMTU3LjE3NTkgYyAtMC4wMDgsMC4yMDUwNCAtMC4wMTM1LDAuNDEwODQgLTAuMDEzNSwwLjYxODA1IDAsLTAuMjA3MSAwLjAwNSwtMC40MTMxNSAwLjAxMzUsLTAuNjE4MDUgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDY0IgogICAgICAgICBkPSJtIDMzOS45NTAxLDIwOC43NjQ0OCAwLjAwMywwLjAwMiBjIDAuMTM5MTIsLTAuMDQxMyAwLjI3NzYzLC0wLjA4NDkgMC40MTQ5NSwtMC4xMzAyMiAtMC4xMzc4LDAuMDQ1NCAtMC4yNzc0NCwwLjA4NzIgLTAuNDE3MDQsMC4xMjg2NyB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NjIiCiAgICAgICAgIGQ9Im0gMzQ0LjgwODcsMjA2LjI0NTc3IGMgLTAuMjI0NiwwLjE3NzMgLTAuNDU0MjMsMC4zNDg2IC0wLjY4OTM0LDAuNTEyNjMgMC4yMzUxNiwtMC4xNjQwNyAwLjQ2NDY5LC0wLjMzNTI5IDAuNjg5MzQsLTAuNTEyNjMgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDYwIgogICAgICAgICBkPSJtIDM0NC4wOTQ1NCwyMDYuNzc1OTcgYyAtMC4xMTYxOCwwLjA4MDcgLTAuMjMzODEsMC4xNTkzMiAtMC4zNTI0MiwwLjIzNjY4IDAuMTE4NjQsLTAuMDc3NCAwLjIzNjIyLC0wLjE1NTk4IDAuMzUyNDIsLTAuMjM2NjggeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDU4IgogICAgICAgICBkPSJtIDM0My42NjcxOSwyMDcuMDYwNzEgYyAtMC4yMzE3LDAuMTQ5MDcgLTAuNDY3OTQsMC4yOTE4NSAtMC43MDg1LDAuNDI3ODggMC4yNDA2NCwtMC4xMzYwNyAwLjQ3NjcyLC0wLjI3ODc3IDAuNzA4NSwtMC40Mjc4OCB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NTYiCiAgICAgICAgIGQ9Im0gMzQyLjkyNzE4LDIwNy41MDY2NyBjIC0wLjEyOTA5LDAuMDcyNiAtMC4yNTkxNiwwLjE0MzE2IC0wLjM5MDY4LDAuMjExODggMC4xMzE0OSwtMC4wNjg3IDAuMjYxNTksLTAuMTM5MzEgMC4zOTA2OCwtMC4yMTE4OCB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NTQiCiAgICAgICAgIGQ9Im0gMzQyLjUwOTExLDIwNy43MzI1IGMgLTAuMjQ3ODEsMC4xMjg4IC0wLjUwMDAzLDAuMjUwNjIgLTAuNzU2MDIsMC4zNjUzNSAwLjI1NTk5LC0wLjExNDczIDAuNTA4MjEsLTAuMjM2NTUgMC43NTYwMiwtMC4zNjUzNSB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NTIiCiAgICAgICAgIGQ9Im0gMjk1LjA0MTM3LDIwOC44OTMxNSBjIDAuMTE5NDYsMC4wMzEzIDAuMjQwNTMsMC4wNTkgMC4zNjEyMSwwLjA4NzMgLTAuMTIwNywtMC4wMjg0IC0wLjI0MTcsLTAuMDU2IC0wLjM2MTIxLC0wLjA4NzMgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDUwIgogICAgICAgICBkPSJtIDI5NS43MDI4MywyMDkuMDQ5MjIgYyAwLjExMjA3LDAuMDIzOCAwLjIyNDg5LDAuMDQ1NCAwLjMzNzk1LDAuMDY2NyAtMC4xMTI5NSwtMC4wMjEzIC0wLjIyNTk4LC0wLjA0MjggLTAuMzM3OTUsLTAuMDY2NyB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICA8cGF0aAogICAgICAgICBpZD0icGF0aDE0NDgiCiAgICAgICAgIGQ9Im0gMjk2LjM4MTMyLDIwOS4xNzYzNCBjIDAuMTA4MTYsMC4wMTc3IDAuMjE2NjIsMC4wMzM4IDAuMzI1NTcsMC4wNDkxIC0wLjEwODksLTAuMDE1MyAtMC4yMTc0NiwtMC4wMzEzIC0wLjMyNTU3LC0wLjA0OTEgeiIKICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MC4yMzk5OTk5OTtmaWxsOiMwMDAwMDA7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlOm5vbmU7c3Ryb2tlLXdpZHRoOjEuMzM2MzQ1NTU7c3Ryb2tlLWxpbmVjYXA6c3F1YXJlO3N0cm9rZS1saW5lam9pbjptaXRlcjtzdHJva2UtbWl0ZXJsaW1pdDo0O3N0cm9rZS1kYXNoYXJyYXk6bm9uZTtzdHJva2UtZGFzaG9mZnNldDowO3N0cm9rZS1vcGFjaXR5OjE7cGFpbnQtb3JkZXI6bWFya2VycyBzdHJva2UgZmlsbCIKICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgPHBhdGgKICAgICAgICAgaWQ9InBhdGgxNDQ2IgogICAgICAgICBkPSJtIDI5Ny4wNzA2OSwyMDkuMjcxOTQgYyAwLjEwMzUxLDAuMDExOSAwLjIwNjkzLDAuMDIzOCAwLjMxMTEsMC4wMzM2IC0wLjEwNDA5LC0wLjAxIC0wLjIwNzY3LC0wLjAyMTYgLTAuMzExMSwtMC4wMzM2IHoiCiAgICAgICAgIHN0eWxlPSJvcGFjaXR5OjAuMjM5OTk5OTk7ZmlsbDojMDAwMDAwO2ZpbGwtb3BhY2l0eToxO3N0cm9rZTpub25lO3N0cm9rZS13aWR0aDoxLjMzNjM0NTU1O3N0cm9rZS1saW5lY2FwOnNxdWFyZTtzdHJva2UtbGluZWpvaW46bWl0ZXI7c3Ryb2tlLW1pdGVybGltaXQ6NDtzdHJva2UtZGFzaGFycmF5Om5vbmU7c3Ryb2tlLWRhc2hvZmZzZXQ6MDtzdHJva2Utb3BhY2l0eToxO3BhaW50LW9yZGVyOm1hcmtlcnMgc3Ryb2tlIGZpbGwiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICAgIDxwYXRoCiAgICAgICAgIGlkPSJyZWN0MTMyOCIKICAgICAgICAgZD0ibSAyOTcuODMyNCwyMDkuMzM5MTIgYyAwLjA3NjUsMC4wMDUgMC4xNTI1OCwwLjAxMTMgMC4yMjk0NCwwLjAxNSAtMC4wNzY5LC0wLjAwNCAtMC4xNTI4NywtMC4wMTAyIC0wLjIyOTQ0LC0wLjAxNSB6IgogICAgICAgICBzdHlsZT0ib3BhY2l0eTowLjIzOTk5OTk5O2ZpbGw6IzAwMDAwMDtmaWxsLW9wYWNpdHk6MTtzdHJva2U6bm9uZTtzdHJva2Utd2lkdGg6MS4zMzYzNDU1NTtzdHJva2UtbGluZWNhcDpzcXVhcmU7c3Ryb2tlLWxpbmVqb2luOm1pdGVyO3N0cm9rZS1taXRlcmxpbWl0OjQ7c3Ryb2tlLWRhc2hhcnJheTpub25lO3N0cm9rZS1kYXNob2Zmc2V0OjA7c3Ryb2tlLW9wYWNpdHk6MTtwYWludC1vcmRlcjptYXJrZXJzIHN0cm9rZSBmaWxsIgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgPC9nPgogIDwvZz4KPC9zdmc+Cg==" 
                  alt="Google Maps" 
                  className="h-13 w-9 object-cover" 
                />
              </div>
              <span className="text-sm font-medium">Apple Maps</span>
            </a>
            
            {/* Yandex Maps */}
            <a
              href={getDirectionsUrl(location, address, 'yandex')}
              className="flex flex-col items-center justify-center p-3 rounded-lg transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                console.debug('Opening Yandex Maps directions');
                setOpenMapMenu(null);
              }}
            >
              <div className="h-14 w-14 bg-white rounded-full flex items-center justify-center shadow mb-2">
              <img 
                  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNOCAxQzQuNjg2MiAxIDIgMy42ODYyIDIgN0MyIDguNjU2MyAyLjY3MTEgMTAuMTU2IDMuNzU2NSAxMS4yNDE3QzQuODQyMiAxMi4zMjggNy40IDEzLjkgNy41NSAxNS41NUM3LjU3MjQ5IDE1Ljc5NzQgNy43NTE2IDE2IDggMTZDOC4yNDg0IDE2IDguNDI3NTEgMTUuNzk3NCA4LjQ1IDE1LjU1QzguNiAxMy45IDExLjE1NzggMTIuMzI4IDEyLjI0MzUgMTEuMjQxN0MxMy4zMjg5IDEwLjE1NiAxNCA4LjY1NjMgMTQgN0MxNCAzLjY4NjIgMTEuMzEzOCAxIDggMVoiIGZpbGw9IiNGRjQ0MzMiLz48cGF0aCBkPSJNOC4wMDAwMiA5LjEwMDE1QzkuMTU5ODIgOS4xMDAxNSAxMC4xIDguMTU5OTQgMTAuMSA3LjAwMDE1QzEwLjEgNS44NDAzNSA5LjE1OTgyIDQuOTAwMTUgOC4wMDAwMiA0LjkwMDE1QzYuODQwMjMgNC45MDAxNSA1LjkwMDAyIDUuODQwMzUgNS45MDAwMiA3LjAwMDE1QzUuOTAwMDIgOC4xNTk5NCA2Ljg0MDIzIDkuMTAwMTUgOC4wMDAwMiA5LjEwMDE1WiIgZmlsbD0id2hpdGUiLz48L3N2Zz4K" 
                  alt="Google Maps" 
                  className="h-13 w-9 object-cover" 
                />
              </div>
              <span className="text-sm font-medium">Yandex Maps</span>
            </a>
          </div>
          
          {/* Cancel button */}
          <button
            className="w-full py-3 mt-2 font-medium text-gray-600 bg-gray-100 rounded-lg"
            onClick={() => setOpenMapMenu(null)}
          >
            Cancel
          </button>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-30 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <motion.div
        className="fixed top-0 right-0 h-full w-full sm:w-3/4 md:w-1/2 lg:w-2/5 xl:w-1/3 bg-white z-30 shadow-xl overflow-y-auto"
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">Transfer Details</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="h-6 w-6 text-neutral-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Journey Details */}
          <div className="space-y-6 mb-8">
            {/* Locations */}
            <div className="flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-neutral-400 mt-1 flex-shrink-0" />
              <div className="w-full">
                <div className="font-medium text-lg text-neutral-900 flex justify-between">
                  <span>{transfer.longPickupAddress}</span>
                  {/* Always show on development or when on mobile */}
                  {(isMobile || process.env.NODE_ENV === 'development') && (
                    <div className="relative">
                      <button 
                        className="text-primary-600 ml-2"
                        title="Get directions to pickup location"
                        aria-label="Get directions to pickup location"
                        onClick={(e) => handleMapIconClick(e, 'pickup')}
                      >
                        <Navigation size={18} />
                      </button>
                      <MapSelectionBottomSheet 
                        locationType="pickup" 
                        location={transfer.pickupLocation} 
                        address={transfer.longPickupAddress || ''} 
                      />
                    </div>
                  )}
                </div>
                <div className="h-8 border-l-2 border-dashed border-neutral-300 ml-2 my-1"></div>
                <div className="font-medium text-lg text-neutral-900 flex justify-between">
                  <span>{transfer.longDropoffAddress}</span>
                  {/* Always show on development or when on mobile */}
                  {(isMobile || process.env.NODE_ENV === 'development') && (
                    <div className="relative">
                      <button 
                        className="text-primary-600 ml-2"
                        title="Get directions to dropoff location"
                        aria-label="Get directions to dropoff location"
                        onClick={(e) => handleMapIconClick(e, 'dropoff')}
                      >
                        <Navigation size={18} />
                      </button>
                      <MapSelectionBottomSheet 
                        locationType="dropoff" 
                        location={transfer.dropoffLocation} 
                        address={transfer.longDropoffAddress || ''} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-neutral-400" />
                <span className="text-neutral-900">{transfer.date}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-neutral-400" />
                <span className="text-neutral-900">{transfer.pickupTime}</span>
              </div>
            </div>

            {/* Vehicle Type */}
            <div className="flex items-center space-x-3">
              <Car className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.vehicleType}</div>
                <div className="text-sm text-neutral-500">Vehicle Type</div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-neutral-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-neutral-600">Total Price</span>
              <span className="text-xl font-semibold text-neutral-900">EUR {transfer.price || 'N/A'}</span>
            </div>
            
            {/* Share Transfer Link Button */}
            <div>
              {!shareLink ? (
                <button
                  onClick={generateShareLink}
                  disabled={isGeneratingLink}
                  className="w-full flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingLink ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating link...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Share2 className="w-4 h-4 mr-2" />
                      Generate Shareable Link
                    </span>
                  )}
                </button>
              ) : (
                <div className="bg-neutral-50 rounded-lg p-3 mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-neutral-500 flex items-center">
                      <Share2 className="w-3 h-3 mr-1" /> Shareable link (expires 1hr after pickup)
                    </span>
                    <button
                      onClick={copyLinkToClipboard}
                      className="text-primary-600 hover:text-primary-700 flex items-center text-sm"
                      title="Copy to clipboard"
                    >
                      {linkCopied ? (
                        <span className="flex items-center text-green-600">
                          <Check className="w-3 h-3 mr-1" /> Copied!
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="bg-white rounded p-2 text-xs text-neutral-700 break-all border border-neutral-200">
                    {shareLink}
                  </div>
                </div>
              )}
              {shareError && (
                <div className="text-red-500 text-sm mt-1">{shareError}</div>
              )}
            </div>
          </div>

          {/* Passenger Details */}
          <div className="space-y-6">
            {/* Passenger Info */}
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.passengerName}</div>
                <div className="text-sm text-neutral-500">{transfer.passengerCount} passengers</div>
              </div>
            </div>

            {/* Contact - with WhatsApp link */}
            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-neutral-400" />
              <a 
                href={`https://wa.me/${formatPhoneForWhatsApp(transfer.contactPhone)}`}
                className="text-primary-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  // Debug log - Applying rule: Always add debug logs & comments in the code for easier debug & readability
                  console.debug('Opening WhatsApp with phone:', {
                    original: transfer.contactPhone,
                    formatted: formatPhoneForWhatsApp(transfer.contactPhone),
                    url: `https://wa.me/${formatPhoneForWhatsApp(transfer.contactPhone)}`
                  });
                }}
              >
                {transfer.contactPhone}
              </a>
            </div>

            {/* Flight Number */}
            <div className="flex items-center space-x-3">
              <Plane className="w-5 h-5 text-neutral-400" />
              <div>
                <div className="font-medium text-neutral-900">{transfer.flightNumber || 'N/A'}</div>
                <div className="text-sm text-neutral-500">Flight Number</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default TransferDetailDrawer;