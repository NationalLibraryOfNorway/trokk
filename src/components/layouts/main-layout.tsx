import React from 'react';
import FileTree from '@/features/file-tree/file-tree.tsx';
import RegistrationForm from '@/features/registration/registration-form.tsx';
import FilesContainer from '@/features/files-container/files-container.tsx';
import TransferLog from '@/features/transfer-log/transfer-log.tsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
    SidebarProvider,
    useSidebar,
} from '@/components/ui/sidebar.tsx';

const SIDEBAR_WIDTH = 256; // 16rem in pixels

const LeftSidebarToggle: React.FC = () => {
    const { open, toggleSidebar } = useSidebar();
    return (
        <button
            onClick={toggleSidebar}
            className="self-start px-0 h-full border-x-stone-600 border-r-1 rounded-none bg-stone-800/50 shadow-none hover:bg-stone-700 transition-colors"
            aria-label="Toggle File Tree"
        >
            {open ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
    );
};

const RightSidebarToggle: React.FC = () => {
    const { open, toggleSidebar } = useSidebar();
    return (
        <button
            onClick={toggleSidebar}
            className="self-start px-0 border-x-stone-600 border-l-1 h-full rounded-none bg-stone-800/50 shadow-none hover:bg-stone-700 transition-colors"
            aria-label="Toggle Transfer Log"
        >
            {open ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
    );
};

const MainLayout: React.FC = () => {
    const [leftOpen, setLeftOpen] = React.useState(true);
    const [rightOpen, setRightOpen] = React.useState(true);

    return (
        <div className="relative h-full flex w-full overflow-hidden">
            {/* Left Sidebar Provider */}
            <SidebarProvider open={leftOpen} onOpenChange={setLeftOpen} defaultOpen={true}>
                <div className="h-full flex justify-end pr-1">
                    <div
                        className="h-full flex flex-col pr-4 bg-stone-800 overflow-auto transition-all duration-200 ease-linear"
                        style={{
                            width: leftOpen ? `${SIDEBAR_WIDTH}px` : '0px',
                            opacity: leftOpen ? 1 : 0,
                            visibility: leftOpen ? 'visible' : 'hidden'
                        }}
                    >
                        <FileTree />
                    </div>
                    <LeftSidebarToggle />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex relative min-w-0 h-full">
                    {/* Right Sidebar Provider */}
                    <SidebarProvider open={rightOpen} onOpenChange={setRightOpen} defaultOpen={true}>
                        {/* Center Content */}
                        <div className="flex-1 overflow-auto h-full">
                            <FilesContainer />
                        </div>

                        {/* Right Sidebar */}
                        <div className="h-full flex justify-start">
                            <RightSidebarToggle />
                            <div
                                className="h-full flex flex-col bg-stone-800 overflow-auto transition-all duration-200 ease-linear"
                                style={{
                                    width: rightOpen ? `${SIDEBAR_WIDTH}px` : '0px',
                                    opacity: rightOpen ? 1 : 0,
                                    visibility: rightOpen ? 'visible' : 'hidden'
                                }}
                            >
                                <RegistrationForm />
                                <TransferLog />
                            </div>
                        </div>
                    </SidebarProvider>
                </div>
            </SidebarProvider>
        </div>
    );
};

export default MainLayout;
