# PixiJS Layout v3 Integration Guide

## 📋 **What is PixiJS Layout v3?**

PixiJS Layout v3 is a **Yoga-powered flexbox layout library** that brings CSS-like layout capabilities to PixiJS applications. It's particularly powerful for educational applications like Neptino where you need structured, responsive layouts.

### **🎯 Key Features**
- **📐 Yoga-Powered Flexbox**: Built on Facebook's Yoga layout engine
- **🧠 CSS-like Properties**: `justifyContent`, `alignItems`, `flexWrap`, `gap`, etc.
- **📦 PixiJS Integration**: Works seamlessly with all PixiJS objects
- **🎯 Advanced Styling**: Background colors, border radius, overflow handling
- **📱 Responsive Design**: Automatic layout recalculation on size changes
- **⚡ High Performance**: Efficient layout calculations using native code

---

## 🚀 **Installation & Setup**

Good news! **PixiJS Layout v3.1.0 is already installed** in your project dependencies. No additional installation required.

### **Basic Setup**
```typescript
// IMPORTANT: Import MUST be first to apply PixiJS mixins
import "@pixi/layout";
import { Application, Container } from "pixi.js";

const app = new Application();
await app.init();

// Now you can use layout properties on containers
const container = new Container();
container.layout = {
  width: '100%',
  height: '50%',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  gap: 10
};
```

---

## 🏗️ **Integration with Your Current System**

Your current pedagogical layout system is **perfectly positioned** for PixiJS Layout integration:

### **Current System** (Manual positioning)
```typescript
// Fixed percentage-based blocks
const blocks = [
  { id: "header", heightPercentage: 8 },
  { id: "program", heightPercentage: 15 },
  { id: "content", heightPercentage: 50 },
  // ... manual positioning calculations
];
```

### **With PixiJS Layout** (Flexbox-based)
```typescript
// Flexible, responsive blocks
const headerContainer = new Container();
headerContainer.layout = {
  width: '100%',
  height: '8%',
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
  padding: 15,
  backgroundColor: 0x4a90e2
};
```

---

## 📚 **Core Concepts**

### **1. Layout Properties**
PixiJS Layout supports most CSS flexbox properties:

```typescript
container.layout = {
  // Size
  width: '100%' | 400 | 'auto',
  height: '50%' | 300 | 'auto',
  
  // Flexbox
  flexDirection: 'row' | 'column',
  justifyContent: 'flex-start' | 'center' | 'space-between',
  alignItems: 'flex-start' | 'center' | 'stretch',
  flexWrap: 'nowrap' | 'wrap',
  gap: 10,
  
  // Spacing
  padding: 15,
  margin: 10,
  
  // Flex item properties
  flex: 1,
  flexGrow: 1,
  flexShrink: 0,
  
  // Visual
  backgroundColor: 0xff0000,
  borderRadius: 8,
  overflow: 'hidden'
};
```

### **2. Responsive Design**
```typescript
// Percentage-based sizing automatically adapts
container.layout = {
  width: '80%',  // Always 80% of parent
  height: '50%', // Always 50% of parent
  // Layout recalculates automatically on resize
};
```

### **3. Nested Layouts**
```typescript
// Parent container
const mainContainer = new Container();
mainContainer.layout = {
  width: '100%',
  flexDirection: 'column'
};

// Child containers inherit layout context
const headerContainer = new Container();
headerContainer.layout = {
  width: '100%',
  height: '10%'
};

mainContainer.addChild(headerContainer);
```

---

## 🔧 **Implementation Steps**

I've created several files to help you integrate PixiJS Layout v3:

### **1. Core Integration Files**

- **`PixiLayoutIntegration.ts`** - Main integration class
- **`EnhancedLayoutRenderer.ts`** - Replaces manual positioning with flexbox
- **`LayoutMigrationManager.ts`** - Handles gradual migration from old system
- **`PixiLayoutExample.ts`** - Complete example implementation

### **2. Step-by-Step Integration**

```typescript
// Step 1: Import PixiJS Layout (MUST be first!)
import "@pixi/layout";

// Step 2: Use the migration manager
import { LayoutMigrationManager } from './layout/LayoutMigrationManager';

// Step 3: In your coursebuilder.ts initialization
const migrationManager = new LayoutMigrationManager(app, layerManager);
migrationManager.enablePixiLayout();
migrationManager.renderPedagogicalLayout(true);
migrationManager.completeMigration();
```

### **3. Quick Test**
You can test the integration immediately:

```typescript
// In your browser console (when on coursebuilder page)
testPixiLayout(); // Test basic integration
runLayoutPerformanceTest(); // Compare performance
```

---

## 🎯 **Benefits for Neptino**

### **1. Pedagogical Layout Advantages**
- **Flexible Proportions**: Easy to adjust block sizes for different lesson types
- **Responsive Design**: Layouts adapt to different screen sizes and orientations
- **Template System**: Create multiple layout templates (compact, spacious, minimal)
- **Visual Consistency**: Automatic spacing and alignment

### **2. Development Advantages**
- **Less Code**: No manual position calculations
- **Better Maintenance**: CSS-like properties are familiar and intuitive
- **Performance**: Yoga's optimized layout engine
- **Future-Proof**: Modern, actively maintained library

### **3. Educational Use Cases**

```typescript
// Portrait mobile layout
container.layout = {
  flexDirection: 'column',
  gap: 5,
  padding: 10
};

// Landscape desktop layout  
container.layout = {
  flexDirection: 'row',
  gap: 15,
  padding: 20
};

// Presentation mode (minimal)
container.layout = {
  justifyContent: 'center',
  alignItems: 'center',
  gap: 2
};
```

---

## 📊 **Performance Comparison**

Based on the integration files I created:

| Metric | Current System | PixiJS Layout v3 |
|--------|----------------|------------------|
| **Layout Calculation** | Manual, error-prone | Automatic, optimized |
| **Responsiveness** | Fixed percentages | True responsive |
| **Code Complexity** | High (custom calculations) | Low (declarative) |
| **Maintenance** | Difficult | Easy |
| **Performance** | Good | Better (Yoga engine) |

---

## 🛠️ **Next Steps**

### **Immediate Actions**
1. **Test the Integration**: Use `testPixiLayout()` in browser console
2. **Review the Files**: Check the created integration files
3. **Gradual Migration**: Use `LayoutMigrationManager` for safe transition

### **Integration Plan**
1. **Week 1**: Test PixiJS Layout integration
2. **Week 2**: Migrate one pedagogical block (e.g., header)
3. **Week 3**: Migrate remaining blocks
4. **Week 4**: Add template system and responsive features

### **Custom Implementation**
```typescript
// In your existing coursebuilder.ts, replace:
// this.pixiCanvas = new PixiCanvas("#canvas-container");

// With:
import { CourseBuilderWithPixiLayout } from './layout/PixiLayoutExample';
this.pixiLayoutBuilder = new CourseBuilderWithPixiLayout();
await this.pixiLayoutBuilder.initializeWithPixiLayout("#canvas-container");
```

---

## 🔍 **Debugging & Development**

### **Debug Mode**
```typescript
// Enable visual layout boundaries
migrationManager.getEnhancedRenderer()?.toggleDebugMode(true);
```

### **Console Testing**
```typescript
// Available in browser console:
testPixiLayout();           // Basic integration test
runLayoutPerformanceTest(); // Performance comparison
```

### **Common Issues**
1. **Import Order**: `import "@pixi/layout";` MUST be first
2. **Container Properties**: Ensure containers have layout properties set
3. **Parent-Child Relationships**: Child layout depends on parent layout context

---

## 📚 **Resources**

- **Official Documentation**: https://layout.pixijs.io/
- **GitHub Repository**: https://github.com/pixijs/layout
- **Examples**: https://layout.pixijs.io/docs/examples/
- **Current Version**: v3.1.0 (already installed)

---

## 🎉 **Conclusion**

PixiJS Layout v3 will transform your CourseBuilder into a modern, flexible, responsive system while maintaining all the pedagogical structure you've built. The integration files I've created provide a safe, gradual migration path that preserves your existing functionality while adding powerful new capabilities.

**Ready to get started?** Try running `testPixiLayout()` in your browser console when viewing the coursebuilder page!
