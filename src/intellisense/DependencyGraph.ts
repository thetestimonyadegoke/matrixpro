/**
 * Dependency Graph for Calculated Measures and Rows
 * Handles cycle detection and topological ordering for evaluation
 */

export interface DependencyNode {
  id: string;
  type: "measure" | "row";
  name: string;
  formula: string;
  dependencies: string[];
}

export interface DependencyError {
  type: "cycle" | "missing" | "self-reference";
  message: string;
  nodes: string[];
}

export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  addNode(node: DependencyNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacencyList.has(node.id)) {
      this.adjacencyList.set(node.id, new Set());
    }
    for (const dep of node.dependencies) {
      this.adjacencyList.get(node.id)!.add(dep);
    }
  }

  removeNode(id: string): void {
    this.nodes.delete(id);
    this.adjacencyList.delete(id);
    for (const deps of this.adjacencyList.values()) {
      deps.delete(id);
    }
  }

  getNode(id: string): DependencyNode | undefined {
    return this.nodes.get(id);
  }

  detectCycles(): DependencyError[] {
    const errors: DependencyError[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cyclePaths: string[][] = [];

    const dfs = (nodeId: string, path: string[]): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const deps = this.adjacencyList.get(nodeId) || new Set();
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (dfs(dep, [...path])) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          const cycleStart = path.indexOf(dep);
          const cycle = path.slice(cycleStart);
          cycle.push(dep);
          cyclePaths.push(cycle);
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    for (const cycle of cyclePaths) {
      const names = cycle.map(id => this.nodes.get(id)?.name || id);
      errors.push({
        type: "cycle",
        message: `Circular dependency detected: ${names.join(" → ")}`,
        nodes: cycle,
      });
    }

    return errors;
  }

  detectSelfReferences(): DependencyError[] {
    const errors: DependencyError[] = [];
    for (const [id, node] of this.nodes) {
      if (node.dependencies.includes(id)) {
        errors.push({
          type: "self-reference",
          message: `${node.name} references itself`,
          nodes: [id],
        });
      }
    }
    return errors;
  }

  detectMissingDependencies(availableIds: Set<string>): DependencyError[] {
    const errors: DependencyError[] = [];
    for (const [id, node] of this.nodes) {
      for (const dep of node.dependencies) {
        if (!availableIds.has(dep) && !this.nodes.has(dep)) {
          errors.push({
            type: "missing",
            message: `${node.name} references unknown identifier: ${dep}`,
            nodes: [id, dep],
          });
        }
      }
    }
    return errors;
  }

  getTopologicalOrder(): string[] | null {
    const inDegree = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      inDegree.set(id, 0);
    }

    for (const deps of this.adjacencyList.values()) {
      for (const dep of deps) {
        if (inDegree.has(dep)) {
          inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
        }
      }
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const deps = this.adjacencyList.get(current) || new Set();
      for (const dep of deps) {
        if (inDegree.has(dep)) {
          const newDegree = (inDegree.get(dep) || 1) - 1;
          inDegree.set(dep, newDegree);
          if (newDegree === 0) {
            queue.push(dep);
          }
        }
      }
    }

    if (result.length !== this.nodes.size) {
      return null; // Cycle exists
    }

    return result;
  }

  getEvaluationOrder(): string[] {
    const order = this.getTopologicalOrder();
    return order ? order.reverse() : [];
  }

  getDependents(id: string): string[] {
    const dependents: string[] = [];
    for (const [nodeId, deps] of this.adjacencyList) {
      if (deps.has(id)) {
        dependents.push(nodeId);
      }
    }
    return dependents;
  }

  getDependencies(id: string): string[] {
    const deps = this.adjacencyList.get(id);
    return deps ? Array.from(deps) : [];
  }

  validate(availableIds: Set<string>): DependencyError[] {
    return [
      ...this.detectSelfReferences(),
      ...this.detectCycles(),
      ...this.detectMissingDependencies(availableIds),
    ];
  }

  clear(): void {
    this.nodes.clear();
    this.adjacencyList.clear();
  }
}

export function extractDependencies(formula: string): string[] {
  const deps: string[] = [];
  
  // Extract measure references [MeasureName]
  const measureRefs = formula.match(/\[([^\]]+)\]/g) || [];
  for (const ref of measureRefs) {
    deps.push(`measure:${ref.slice(1, -1)}`);
  }

  // Extract scoped row references Scope[Member]
  const scopedRefs = formula.match(/(\w+)\[([^\]]+)\]/g) || [];
  for (const ref of scopedRefs) {
    const match = ref.match(/(\w+)\[([^\]]+)\]/);
    if (match) {
      deps.push(`row:${match[1]}:${match[2]}`);
    }
  }

  // Extract MEASURE("name") references
  const measureFuncRefs = formula.match(/MEASURE\s*\(\s*"([^"]+)"\s*\)/gi) || [];
  for (const ref of measureFuncRefs) {
    const match = ref.match(/MEASURE\s*\(\s*"([^"]+)"\s*\)/i);
    if (match) {
      deps.push(`measure:${match[1]}`);
    }
  }

  // Extract ROW("member") references
  const rowRefs = formula.match(/ROW\s*\(\s*"([^"]+)"\s*\)/gi) || [];
  for (const ref of rowRefs) {
    const match = ref.match(/ROW\s*\(\s*"([^"]+)"\s*\)/i);
    if (match) {
      deps.push(`row:${match[1]}`);
    }
  }

  // Extract ROWPATH("path") references
  const rowPathRefs = formula.match(/ROWPATH\s*\(\s*"([^"]+)"\s*\)/gi) || [];
  for (const ref of rowPathRefs) {
    const match = ref.match(/ROWPATH\s*\(\s*"([^"]+)"\s*\)/i);
    if (match) {
      deps.push(`rowpath:${match[1]}`);
    }
  }

  return [...new Set(deps)];
}
