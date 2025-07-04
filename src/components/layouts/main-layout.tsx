import React from 'react';
import FileTree from '../../features/file-tree/file-tree.tsx';
import Split from 'react-split';
import './main-layout.css';
import RegistrationForm from '../../features/registration/registration-form.tsx';
import FilesContainer from '../../features/files-container/files-container.tsx';
import TransferLog from '../../features/transfer-log/transfer-log.tsx';

const MainLayout: React.FC = () => {
    return (
        <Split
            sizes={[20, 60, 20]}
            className="split h-screen"
        >
            <div className="sticky top-0 overflow-x-auto h-full">
                <FileTree />
            </div>
            <div className="h-full">
                <FilesContainer />
            </div>
            <div className="h-full">
                    <RegistrationForm />
                    <TransferLog />
            </div>
        </Split>
    );
};

export default MainLayout;