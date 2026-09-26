const fs = require('fs');
const file = 'frontend/patient/assets/map/hospital-nodes.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

const SNAP_THRESHOLD = 7; // pixels

data.floors.forEach(floor => {
  // We will do a simple iterative relaxation to snap coordinates
  let changed = true;
  let iterations = 0;
  
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    
    floor.edges.forEach(edge => {
      const n1 = floor.nodes.find(n => n.id === edge.from);
      const n2 = floor.nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return;
      
      const dx = Math.abs(n1.x - n2.x);
      const dy = Math.abs(n1.y - n2.y);
      
      if (dx > 0 && dx < SNAP_THRESHOLD) {
        const avgX = (n1.x + n2.x) / 2;
        n1.x = avgX;
        n2.x = avgX;
        changed = true;
      }
      
      if (dy > 0 && dy < SNAP_THRESHOLD) {
        const avgY = (n1.y + n2.y) / 2;
        n1.y = avgY;
        n2.y = avgY;
        changed = true;
      }
    });
  }
  
  // round to 1 decimal
  floor.nodes.forEach(n => {
    n.x = Math.round(n.x * 10) / 10;
    n.y = Math.round(n.y * 10) / 10;
  });
});

fs.writeFileSync(file.replace('.json', '-snapped.json'), JSON.stringify(data, null, 2));
console.log('Done snapping! Saved to hospital-nodes-snapped.json');
