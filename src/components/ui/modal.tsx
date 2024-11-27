import React from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-40">
            <div className="bg-stone-800 p-4 rounded shadow-lg text-white relative z-50">
                <button onClick={onClose} className="absolute -top-14 right-0 text-white bg-stone-700">X</button>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default Modal;