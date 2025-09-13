import React from 'react';
import { GameCanvas } from './GameCanvas';

export const DemoPage: React.FC = () => {
    return (
        <div style={{ padding: '20px 0', backgroundColor: '#0b0f19', minHeight: '100vh', color: 'white', width: '100%' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Royale War - Game Development Demo</h1>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                width: '100%',
                margin: '0 auto'
            }}>
                {/* Local Canvas Game */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#9cff6b' }}>
                        Local Canvas Game
                    </h2>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <GameCanvas width={1200} height={800} />
                    </div>
                    <div style={{ marginTop: '20px', fontSize: '16px', color: '#888', textAlign: 'center' }}>
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