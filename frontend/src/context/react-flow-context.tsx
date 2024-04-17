// react-flow-context.tsx
import React, { createContext, useContext, useState } from 'react';

const UpdateContext = createContext({
    triggerUpdate: () => {},
    onUpdateTriggered: false
});

export const UpdateProvider:any = ({ children }) => {
    const [onUpdateTriggered, setOnUpdateTriggered] = useState(false);

    const triggerUpdate = () => {
        setOnUpdateTriggered(true);
        setTimeout(() => setOnUpdateTriggered(false), 3000); // Reset after notification
    };

    return (
        <UpdateContext.Provider value={{ triggerUpdate, onUpdateTriggered }}>
            {children}
        </UpdateContext.Provider>
    );
};

export const useUpdate = () => useContext(UpdateContext);
