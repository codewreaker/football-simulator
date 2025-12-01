import { useState } from 'react';
import GamePad from '../assets/icons/gamepad.svg?react';
import AlertCircle from '../assets/icons/circle-alert.svg?react';
import CheckCircle from '../assets/icons/circle-check-big.svg?react';
import './welcome.css'

const updatedFiles = [
  {
    name: 'GameEngine.ts',
    path: 'src/engine/GameEngine.ts',
    changes: [
      'Added delta time calculation for frame-independent movement',
      'Improved game loop with consistent 60 FPS targeting',
      'Enhanced collision detection system',
      'Added player selection system for human control',
      'Implemented better state management',
      'Added proper ball possession tracking'
    ],
    priority: 'critical'
  },
  {
    name: 'Player.ts',
    path: 'src/engine/entities/Player.ts',
    changes: [
      'Completely rewrote physics system with realistic acceleration',
      'Added stamina system affecting player speed',
      'Implemented intelligent positioning based on ball location',
      'Added proper possession detection',
      'Enhanced role-based behavior (defenders, midfielders, forwards)',
      'Added visual indicator for selected/controlled player',
      'Improved boundary collision handling'
    ],
    priority: 'critical'
  },
  {
    name: 'Ball.ts',
    path: 'src/engine/entities/Ball.ts',
    changes: [
      'Rewrote physics with realistic friction and deceleration',
      'Added spin mechanics for curved passes',
      'Improved goal detection with proper positioning',
      'Enhanced boundary collision with realistic bouncing',
      'Added ball possession transfer logic',
      'Implemented better visual feedback'
    ],
    priority: 'critical'
  },
  {
    name: 'AIPlayerController.ts',
    path: 'src/engine/controllers/AIPlayerController.ts',
    changes: [
      'Complete rewrite of AI decision-making system',
      'Added formation awareness and tactical positioning',
      'Implemented intelligent passing with teammate evaluation',
      'Enhanced shooting logic with angle and power calculation',
      'Added defensive positioning based on ball location',
      'Implemented pressing and marking behavior',
      'Added role-specific AI behaviors',
      'Improved reaction times based on difficulty'
    ],
    priority: 'critical'
  },
  {
    name: 'HumanPlayerController.ts',
    path: 'src/engine/controllers/HumanPlayerController.ts',
    changes: [
      'Rewrote input handling for smoother control',
      'Added sprint functionality (Shift key)',
      'Implemented proper pass/shoot mechanics',
      'Added player switching system',
      'Enhanced ball control and dribbling',
      'Improved touch response and acceleration'
    ],
    priority: 'critical'
  },
  {
    name: 'Physics.ts',
    path: 'src/engine/physics/Physics.ts',
    changes: [
      'Enhanced collision resolution algorithm',
      'Added momentum transfer between players',
      'Implemented proper impulse-based physics',
      'Added ball-to-player collision handling',
      'Improved separation algorithm to prevent overlapping'
    ],
    priority: 'high'
  },
  {
    name: 'Renderer.ts',
    path: 'src/engine/renderer/Renderer.ts',
    changes: [
      'Added player selection indicators',
      'Implemented possession indicators',
      'Enhanced visual feedback for controlled players',
      'Added stamina bars for players',
      'Improved shadow effects for depth perception'
    ],
    priority: 'medium'
  },
  {
    name: 'DifficultyConfig.ts',
    path: 'src/engine/difficulty/DifficultyConfig.ts',
    changes: [
      'Rebalanced all difficulty levels',
      'Added new parameters for enhanced AI',
      'Improved scaling between difficulty levels'
    ],
    priority: 'medium'
  }
];

const keyImprovements = [
  {
    category: 'Movement & Physics',
    improvements: [
      'Frame-independent movement using delta time',
      'Realistic acceleration and deceleration curves',
      'Proper momentum and inertia',
      'Stamina system affecting player performance',
      'Smooth player switching with visual feedback'
    ]
  },
  {
    category: 'AI Intelligence',
    improvements: [
      'Formation-aware positioning',
      'Context-aware decision making',
      'Intelligent passing with target evaluation',
      'Defensive marking and pressing',
      'Role-specific behaviors',
      'Difficulty-based reaction times'
    ]
  },
  {
    category: 'Ball Physics',
    improvements: [
      'Realistic friction and rolling',
      'Proper goal detection',
      'Enhanced boundary collision',
      'Ball possession tracking',
      'Pass power based on distance'
    ]
  },
  {
    category: 'Human Control',
    improvements: [
      'Sprint functionality',
      'Player switching system',
      'Improved touch response',
      'Better pass/shoot mechanics',
      'Smooth acceleration'
    ]
  },
  {
    category: 'Scoring System',
    improvements: [
      'Fixed goal detection logic',
      'Proper goal line validation',
      'Accurate scoring attribution',
      'Goal celebration pause',
      'Automatic ball reset after goals'
    ]
  }
];

const UpdatedFilesReport = ({ onClick }: { onClick: () => void }) => {
  const [selectedFile, setSelectedFile] = useState<number | null>(null);

  return (
    <div className="updates-container">
        <div className="updates-main-card">
          <div onClick={onClick} className="updates-header">
            <div className="updates-icon-box">
              <GamePad />
            </div>
            <div className="updates-header-content">
              <h1>Football Simulator - Click Pad to Start</h1>
              <p>State-of-the-art game engine improvements</p>
            </div>
          </div>

          <div onClick={onClick} className="updates-alert-banner">
            <div className="updates-alert-content">
              <div className="updates-alert-icon">
                <AlertCircle />
              </div>
              <div className="updates-alert-text">
                <h3>🔧 Bug Fixes Applied!</h3>
                <p>
                  All 4 critical issues have been fixed. Update these files to resolve the problems:
                </p>
                <ul className="updates-alert-list">
                  <li>✅ <strong>Player.ts</strong> - Fixed cramping and stuck ball</li>
                  <li>✅ <strong>AIPlayerController.ts</strong> - Better positioning & pressure response</li>
                  <li>✅ <strong>Ball.ts</strong> - Fixed goal detection (ball now enters goal)</li>
                  <li>✅ <strong>GameEngine.ts</strong> - Auto player switching</li>
                  <li>✅ <strong>HumanPlayerController.ts</strong> - Auto-switch support</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="updates-stats-grid">
            <div className="updates-stat-card green">
              <div className="stat-number">{updatedFiles.length}</div>
              <div className="stat-label">Files Updated</div>
            </div>
            <div className="updates-stat-card blue">
              <div className="stat-number">{keyImprovements.length}</div>
              <div className="stat-label">Major Improvements</div>
            </div>
          </div>

          <h2 className="updates-section-heading">Updated Files</h2>
          <div className="updates-files-list">
            {updatedFiles.map((file, index) => (
              <div
                key={index}
                className={`updates-file-item ${selectedFile === index ? 'selected' : ''}`}
                onClick={() => setSelectedFile(selectedFile === index ? null : index)}
              >
                <div className="updates-file-item-header">
                  <div className="updates-file-item-content">
                    <div className="updates-file-icon">
                      <CheckCircle />
                    </div>
                    <div className="updates-file-info">
                      <div className="updates-file-name-row">
                        <h3 className="updates-file-name">{file.name}</h3>
                        <span
                          className={`updates-priority-badge ${file.priority}`}
                        >
                          {file.priority.toUpperCase()}
                        </span>
                      </div>
                      <p className="updates-file-path">{file.path}</p>
                      {selectedFile === index && (
                        <ul className="updates-file-changes">
                          {file.changes.map((change, idx) => (
                            <li key={idx}>
                              <span className="bullet">•</span>
                              <span>{change}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className="updates-file-toggle">
                    {selectedFile === index ? '▼' : '▶'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="updates-section-heading">Key Improvements</h2>
          <div className="updates-improvements-grid">
            {keyImprovements.map((category, index) => (
              <div key={index} className="updates-improvement-card">
                <h3>{category.category}</h3>
                <ul className="updates-improvement-list">
                  {category.improvements.map((improvement, idx) => (
                    <li key={idx}>
                      <span className="checkmark">✓</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
};

export default UpdatedFilesReport;