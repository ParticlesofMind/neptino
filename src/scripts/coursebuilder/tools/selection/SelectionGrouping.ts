import { Container, Point } from 'pixi.js';
import { DisplayObjectManager } from '../../canvas/DisplayObjectManager';

export class SelectionGrouping {
  public group(selected: any[], container: Container | null, dm: DisplayObjectManager | null): { newSelection: any[] } | null {
    if (!selected || selected.length < 2) return null;
    const firstParent: Container | null = (selected[0] as any).parent || null;
    const parent = firstParent || container || dm?.getRoot() || null;
    if (!parent) return null;
    try {
      const grpInfo = (dm as any)?.createContainer ? (dm as any).createContainer(parent) : null;
      const group: Container = grpInfo ? grpInfo.container : new Container();
      if (!grpInfo) parent.addChild(group);
      const indices = selected.map(o => parent.children.indexOf(o)).filter(i => i >= 0);
      const insertIdx = indices.length ? Math.max(...indices) : parent.children.length - 1;
      try { parent.setChildIndex(group, insertIdx + 1); } catch {}
      const moved: any[] = [];
      selected.forEach((obj) => {
        try {
          const world = (obj as any).getGlobalPosition ? (obj as any).getGlobalPosition(new Point()) : new Point((obj as any).x || 0, (obj as any).y || 0);
          if ((obj as any).parent) (obj as any).parent.removeChild(obj);
          group.addChild(obj as any);
          const local = group.toLocal(world);
          (obj as any).position?.set(local.x, local.y);
          moved.push(obj);
        } catch {}
      });
      return { newSelection: [group as any] };
    } catch {
      return null;
    }
  }

  public ungroup(selected: any[], container: Container | null, dm: DisplayObjectManager | null): { newSelection: any[] } | null {
    if (!selected || selected.length === 0) return null;
    let changed = false; const newSelection: any[] = [];
    for (const obj of selected) {
      const cont = obj as any; if (!cont?.children || cont.children.length === 0) continue;
      const parent: Container | null = cont.parent || container || dm?.getRoot() || null; if (!parent) continue;
      try {
        const children = cont.children.slice();
        for (const child of children) {
          const world = (child as any).getGlobalPosition ? (child as any).getGlobalPosition(new Point()) : new Point((child as any).x || 0, (child as any).y || 0);
          cont.removeChild(child); parent.addChild(child);
          const local = parent.toLocal(world); (child as any).position?.set(local.x, local.y);
          newSelection.push(child);
        }
        if ((dm as any)?.remove) { (dm as any).remove(cont); } else { cont.parent?.removeChild(cont); cont.destroy?.(); }
        changed = true;
      } catch {}
    }
    if (changed) return { newSelection }; return null;
  }
}

