import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTutorial } from '../context/TutorialContext';
import { getTutorialForPath, TutorialDefinition, TutorialRole } from '../tutorial/tutorialDefinitions';
import TutorialOverlay from './TutorialOverlay';

const TutorialController: React.FC = () => {
    const location = useLocation();
    const { user } = useAuth();
    const { enabled, seenScreens, markSeen } = useTutorial();
    const [activeTutorial, setActiveTutorial] = React.useState<TutorialDefinition | null>(null);

    React.useEffect(() => {
        if (!enabled || !user?.role) {
            setActiveTutorial(null);
            return;
        }

        const definition = getTutorialForPath(location.pathname, user.role as TutorialRole);
        if (!definition) {
            setActiveTutorial(null);
            return;
        }

        if (seenScreens[definition.key]) {
            setActiveTutorial(null);
            return;
        }

        setActiveTutorial(definition);
    }, [enabled, location.pathname, seenScreens, user?.role]);

    const handleClose = () => {
        if (activeTutorial) {
            markSeen(activeTutorial.key);
        }
        setActiveTutorial(null);
    };

    if (!activeTutorial) {
        return null;
    }

    return (
        <TutorialOverlay
            title={activeTutorial.title}
            steps={activeTutorial.steps}
            onClose={handleClose}
        />
    );
};

export default TutorialController;
