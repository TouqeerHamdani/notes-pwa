import { useSyncStatus } from '../hooks/useSyncStatus';
import supabase from '../lib/supabaseClient';
import { logout } from '../lib/api';
import { FiLogOut, FiEdit, FiFolder } from 'react-icons/fi';
import { IoCheckmarkCircleOutline, IoCloudUploadOutline, IoCloudOfflineOutline } from 'react-icons/io5';

const Navbar = ({ onNewNote, mobileView, setMobileView }) => {
  const syncStatus = useSyncStatus();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await logout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-accent-300 border-b border-accent-200 text-white px-4 py-2.5 flex items-center justify-between h-14 select-none z-10">
      <div className="flex items-center space-x-3">
        <button
          onClick={() => setMobileView && setMobileView(mobileView === 'folders' ? 'list' : 'folders')}
          className="md:hidden p-1.5 rounded-md hover:bg-accent-50 text-amber-400 transition"
          title="Toggle Folders"
        >
          <FiFolder className="text-xl" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
            <span className="text-accent-700 font-extrabold text-sm">N</span>
          </div>
          <span className="font-semibold text-base tracking-tight text-gray-100 hidden sm:inline-block">
            Notes PWA
          </span>
        </div>
      </div>

      <div className="flex items-center">
        <div className="flex items-center space-x-2 bg-accent-500/80 px-3 py-1 rounded-full border border-accent-50 text-xs font-medium shadow-inner">
          {syncStatus === 'Synced' && (
            <>
              <IoCheckmarkCircleOutline className="text-emerald-400 text-sm" />
              <span className="text-emerald-300">Synced</span>
            </>
          )}
          {syncStatus === 'Syncing...' && (
            <>
              <IoCloudUploadOutline className="text-amber-400 text-sm animate-pulse" />
              <span className="text-amber-300">Syncing...</span>
            </>
          )}
          {syncStatus === 'Offline' && (
            <>
              <IoCloudOfflineOutline className="text-gray-400 text-sm" />
              <span className="text-gray-400">Offline</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {onNewNote && (
          <button
            onClick={onNewNote}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-accent-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Create New Note"
          >
            <FiEdit className="text-sm" />
            <span className="hidden sm:inline">New Note</span>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center space-x-1.5 bg-accent-50 hover:bg-accent-200 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-accent-200 active:scale-95 cursor-pointer"
          title="Sign Out"
        >
          <FiLogOut className="text-sm" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
