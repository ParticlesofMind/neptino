/**
 * Demo: PixiJS Layout v3 Educational System Integration
 * Shows how to use the new yoga-powered layout system with Neptino
 */

import { Application } from 'pixi.js';
import { createEducationalLayout, LayoutIntegration } from './layout/LayoutIntegration';

/**
 * Initialize PixiJS Layout v3 Educational System Demo
 */
export async function initializeLayoutDemo(): Promise<void> {
  try {
    // Create PixiJS application (reuse existing one from coursebuilder)
    const app = new Application();
    await app.init({
      width: 1024,
      height: 768,
      backgroundColor: 0xf5f5f5,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Initialize educational layout system
    const layoutIntegration = createEducationalLayout(app);

    console.log('🎨 PixiJS Layout v3 Educational System Demo');
    console.log('========================================');

    // Show available templates
    const templates = layoutIntegration.getTemplates();
    console.log('📚 Available Educational Templates:');
    templates.forEach(template => {
      console.log(`  • ${template.name}: ${template.description}`);
    });

    // Initialize with default standard lesson layout
    layoutIntegration.initializeDefaultLayout();
    console.log('✅ Standard lesson layout created');

    // Demo: Add some collaborators
    layoutIntegration.addCollaborator('teacher-001', 'Dr. Smith', 0x007bff);
    layoutIntegration.addCollaborator('student-001', 'Alice Johnson', 0x28a745);
    layoutIntegration.addCollaborator('student-002', 'Bob Wilson', 0xffc107);
    console.log('👥 Added 3 collaborators to the layout');

    // Demo: Switch to interactive workshop template
    setTimeout(() => {
      const switched = layoutIntegration.switchTemplate('interactive-workshop', {
        collaboration: true,
        accessibility: {
          highContrast: false,
          largeText: true,
          screenReader: true
        }
      });
      
      if (switched) {
        console.log('🔄 Switched to Interactive Workshop layout');
      }
    }, 3000);

    // Demo: Simulate cursor movements
    setTimeout(() => {
      layoutIntegration.updateCollaboratorCursor('teacher-001', 400, 200);
      layoutIntegration.updateCollaboratorCursor('student-001', 300, 350);
      layoutIntegration.updateCollaboratorCursor('student-002', 500, 450);
      console.log('🖱️ Updated collaborator cursor positions');
    }, 1500);

    // Demo: Handle resize events
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      app.renderer.resize(width, height);
      layoutIntegration.onResize(width, height);
      console.log(`📐 Resized layout to ${width}x${height}`);
    });

    // Add to DOM for demo (in real integration, this would be your existing canvas)
    const demoContainer = document.getElementById('layout-demo');
    if (demoContainer) {
      demoContainer.appendChild(app.canvas);
    } else {
      document.body.appendChild(app.canvas);
    }

    console.log('🎯 Layout demo initialized successfully!');
    console.log('Features enabled:');
    console.log('  ✅ Yoga-powered flexbox layouts');
    console.log('  ✅ Educational content blocks');
    console.log('  ✅ Real-time collaboration cursors');
    console.log('  ✅ Responsive design (try resizing!)');
    console.log('  ✅ Accessibility features');
    console.log('  ✅ Multiple layout templates');

  } catch (error) {
    console.error('❌ Failed to initialize layout demo:', error);
  }
}

/**
 * Integration example for existing coursebuilder
 */
export function integrateWithCoursebuilder(existingApp: Application): LayoutIntegration {
  // Create layout integration using existing PixiJS app
  const layoutIntegration = createEducationalLayout(existingApp);
  
  // Initialize with standard lesson template
  layoutIntegration.initializeDefaultLayout();
  
  // Example: Create custom educational block configuration
  const customConfig = {
    type: 'lesson' as const,
    collaboration: true,
    responsiveBreakpoints: {
      mobile: 320,
      tablet: 768,
      desktop: 1024
    },
    accessibility: {
      highContrast: false,
      largeText: false,
      screenReader: true
    }
  };

  // Switch to interactive workshop for collaborative sessions
  layoutIntegration.switchTemplate('interactive-workshop', customConfig);
  
  console.log('🔗 PixiJS Layout v3 integrated with existing coursebuilder');
  
  // Return integration for further use
  return layoutIntegration;
}
