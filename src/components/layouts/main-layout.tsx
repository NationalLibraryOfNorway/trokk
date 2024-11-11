import React from 'react';
import FileTree from "../../features/file-tree/file-tree.tsx";
import Split from "react-split";
import './main-layout.css'
import RegistrationForm from "../../features/registration/registration-form.tsx";
import FilesContainer from "../../features/files-container/files-container.tsx";
import {TransferLogProvider} from "../../context/transfer-log-context.tsx";
import TransferLog from "../../features/transfer-log/transfer-log.tsx";

const MainLayout: React.FC = () => {
    return (
        <Split
            sizes={[20, 60, 20]}
            minSize={[5, 10, 5]}
            className="split h-screen"
        >
            <div className="sticky top-0 overflow-x-auto h-full">
                <FileTree/>
            </div>
            <div className="h-full">
                <FilesContainer/>
            </div>
            <div className="h-full">
                <TransferLogProvider>
                    <RegistrationForm/>
                    <TransferLog/>
                </TransferLogProvider>
            </div>
        </Split>
    );
};

export default MainLayout;