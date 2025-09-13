import React from 'react';
import { GameCanvas } from './GameCanvas';

export const DemoPage: React.FC = () => {
    return (
        <div style={{ padding: '20px', backgroundColor: '#0b0f19', minHeight: '100vh', color: 'white' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Royale War - Game Development Demo</h1>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '40px',
                maxWidth: '1600px',
                margin: '0 auto'
            }}>
                {/* SpaceTimeDB Multiplayer Game */}
                {/* <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#62d2ff' }}>
                        SpaceTimeDB Multiplayer
                    </h2>
                    <div style={{
                        border: '2px solid #62d2ff',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flex: 1
                    }}>
                        <App />
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
                        <p>• Real-time multiplayer with server authority</p>
                        <p>• SpaceTimeDB backend synchronization</p>
                        <p>• React + TypeScript frontend</p>
                    </div>
                </div> */}

                {/* Local Canvas Game */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#9cff6b' }}>
                        Local Canvas Game
                    </h2>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <GameCanvas width={600} height={450} />
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '14px', color: '#888' }}>
                        <p>• Canvas-based rendering with sprites</p>
                        <p>• Local game loop and entity system</p>
                        <p>• Ported from original frontend code</p>
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: '40px',
                textAlign: 'center',
                padding: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                maxWidth: '800px',
                margin: '40px auto 0'
            }}>
                <h3>Integration Status</h3>
                <p>
                    The functional code from <code>@frontend/</code> has been successfully migrated to <code>@front/client/</code>.
                    This includes assets, utilities, entities, and game systems converted to TypeScript.
                </p>
                <p style={{ marginTop: '15px', fontSize: '14px', color: '#aaa' }}>
                    Next steps: Integrate the enhanced rendering and game logic with the SpaceTimeDB multiplayer system
                    for a unified gaming experience.
                </p>
            </div>
        </div>
    );
};