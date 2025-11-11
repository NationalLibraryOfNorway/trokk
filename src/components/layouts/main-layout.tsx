import React from 'react';
import FileTree from '@/features/file-tree/file-tree.tsx';
import RegistrationForm from '@/features/registration/registration-form.tsx';
import FilesContainer from '@/features/files-container/files-container.tsx';
import TransferLog from '@/features/transfer-log/transfer-log.tsx';
import {ChevronLeft, ChevronRight} from 'lucide-react';
import {Button} from '@/components/ui/button.tsx';

const SIDEBAR_WIDTH = 280;

const MainLayout: React.FC = () => {
    const [leftOpen, setLeftOpen] = React.useState(true);
    const [rightOpen, setRightOpen] = React.useState(true);

    return (
        <div className="flex flex-1 min-h-0 w-full">
            <div className="flex items-stretch min-h-0">
                <div
                    className="bg-stone-800 overflow-auto transition-[width,opacity] duration-200 ease-linear flex flex-col"
                    style={{
                        width: leftOpen ? SIDEBAR_WIDTH : 0,
                        opacity: leftOpen ? 1 : 0,
                        visibility: leftOpen ? 'visible' : 'hidden'
                    }}
                >
                    <FileTree/>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setLeftOpen(o => !o)}
                    aria-label="Toggle venstre panel"
                    className="h-full w-5 flex items-center justify-center px-0 transition-colors rounded-none shadow-none"
                >
                    {leftOpen ? <ChevronLeft size={15}/> : <ChevronRight size={15}/>}
                </Button>
            </div>
            <div className="flex flex-1 min-h-0">
                <div className="flex flex-1 min-h-0">
                    <FilesContainer/>
                </div>
                <div className="flex items-stretch min-h-0">
                    <Button
                        variant="outline"
                        onClick={() => setRightOpen(o => !o)}
                        aria-label="Toggle høyre panel"
                        className="h-full w-5 flex items-center justify-center px-0  rounded-none shadow-none"
                    >
                        {rightOpen ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}
                    </Button>
                    <div
                        className="bg-stone-800 overflow-auto transition-[width,opacity] duration-200 ease-linear flex flex-col"
                        style={{
                            width: rightOpen ? SIDEBAR_WIDTH : 0,
                            opacity: rightOpen ? 1 : 0,
                            visibility: rightOpen ? 'visible' : 'hidden'
                        }}
                    >
                        <RegistrationForm/>
                        <TransferLog/>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MainLayout;
