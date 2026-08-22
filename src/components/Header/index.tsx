import DropdownNotification from './DropdownNotification';
import DropdownUser from './DropdownUser';
import DarkModeSwitcher from './DarkModeSwitcher';

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  return (
    <header className="w-full relative">
      <div className="flex flex-grow items-center bg-white drop-shadow-1 dark:bg-boxdark justify-between px-4 py-4 md:px-6 2xl:px-11">
        <div className="flex-1 lg:block hidden"></div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <DarkModeSwitcher />
          </ul>
          <DropdownUser />
        </div>
      </div>
    </header>
  );
};

export default Header;