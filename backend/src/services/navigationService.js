const db = require('../db');

class PriorityQueue {
    constructor() { this.values = []; }
    enqueue(val, priority) {
        this.values.push({ val, priority });
        this.sort();
    }
    dequeue() { return this.values.shift(); }
    sort() { this.values.sort((a, b) => a.priority - b.priority); }
}

async function findShortestPath(startNodeId, endNodeId) {
    // 1. Get all edges from DB
    const edgesResult = await db.query('SELECT * FROM navigation_edges');
    const edges = edgesResult.rows;

    // 2. Build Adjacency List
    const graph = {};
    const nodes = new Set();
    
    edges.forEach(edge => {
        if (!graph[edge.from_node]) graph[edge.from_node] = [];
        graph[edge.from_node].push({
            node: edge.to_node,
            weight: parseFloat(edge.distance_meters),
            edge_id: edge.edge_id,
            instruction: edge.instruction
        });
        nodes.add(edge.from_node);
        nodes.add(edge.to_node);
    });

    if (!nodes.has(parseInt(startNodeId)) || !nodes.has(parseInt(endNodeId))) {
        throw new Error('Start or end node not found in graph');
    }

    // 3. Dijkstra Algorithm
    const distances = {};
    const previous = {};
    const pq = new PriorityQueue();

    nodes.forEach(node => {
        if (node === parseInt(startNodeId)) {
            distances[node] = 0;
            pq.enqueue(node, 0);
        } else {
            distances[node] = Infinity;
        }
        previous[node] = null;
    });

    while (pq.values.length > 0) {
        let smallest = pq.dequeue().val;

        if (smallest === parseInt(endNodeId)) {
            // We found the path
            const path = [];
            const rawInstructions = [];
            let curr = smallest;
            let totalDistance = 0;

            while (previous[curr]) {
                const prev = previous[curr];
                path.push(curr);
                
                // Find the edge that connects prev.node to curr
                const edgeUsed = graph[prev].find(e => e.node === curr);
                rawInstructions.push({
                    from: prev,
                    to: curr,
                    instruction: edgeUsed.instruction,
                    distance: edgeUsed.weight
                });
                totalDistance += edgeUsed.weight;
                
                curr = prev;
            }
            path.push(parseInt(startNodeId));
            
            rawInstructions.reverse();
            path.reverse();

            // Merge consecutive steps with the SAME instruction (e.g., straight line)
            const mergedInstructions = [];
            let currentStep = null;

            for (let i = 0; i < rawInstructions.length; i++) {
                let rStep = rawInstructions[i];
                if (!currentStep) {
                    currentStep = { ...rStep };
                } else if (currentStep.instruction === rStep.instruction) {
                    // Merge!
                    currentStep.to = rStep.to;
                    currentStep.distance += rStep.distance;
                } else {
                    mergedInstructions.push(currentStep);
                    currentStep = { ...rStep };
                }
            }
            if (currentStep) {
                mergedInstructions.push(currentStep);
            }

            return {
                success: true,
                path: path,
                instructions: mergedInstructions,
                totalDistance: totalDistance
            };
        }

        if (smallest || distances[smallest] !== Infinity) {
            if (graph[smallest]) {
                for (let neighbor of graph[smallest]) {
                    let candidate = distances[smallest] + neighbor.weight;
                    let nextNeighbor = neighbor.node;
                    
                    if (candidate < distances[nextNeighbor]) {
                        distances[nextNeighbor] = candidate;
                        previous[nextNeighbor] = smallest;
                        pq.enqueue(nextNeighbor, candidate);
                    }
                }
            }
        }
    }

    return { success: false, message: 'No path found between these locations.' };
}

module.exports = { findShortestPath };
