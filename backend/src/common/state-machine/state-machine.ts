/**
 * Generic, type-safe state machine utility.
 *
 * Usage:
 *   const machine = new StateMachine<MyState, MyEvent>(transitions, 'MachineName');
 *   const next = machine.transition(current, event); // throws on invalid
 *   const ok   = machine.canTransition(current, event); // boolean check
 */

export type TransitionMap<S extends string, E extends string> = {
  [state in S]?: {
    [event in E]?: S;
  };
};

export class StateMachine<S extends string, E extends string> {
  constructor(
    private readonly transitions: TransitionMap<S, E>,
    private readonly name: string = 'StateMachine',
  ) {}

  /**
   * Returns true if `event` is a valid action from `current` state.
   */
  canTransition(current: S, event: E): boolean {
    const stateTransitions = this.transitions[current];
    if (!stateTransitions) return false;
    return event in stateTransitions;
  }

  /**
   * Performs the transition and returns the target state.
   * Throws a descriptive error if the transition is invalid.
   */
  transition(current: S, event: E): S {
    const stateTransitions = this.transitions[current];
    if (!stateTransitions) {
      throw new Error(
        `[${this.name}] Estado "${current}" no tiene transiciones definidas.`,
      );
    }

    const target = stateTransitions[event];
    if (target === undefined) {
      const validEvents = Object.keys(stateTransitions).join(', ') || 'ninguno';
      throw new Error(
        `[${this.name}] Transicion invalida: "${current}" --[${event}]--> ???. Eventos validos desde "${current}": ${validEvents}.`,
      );
    }

    return target;
  }

  /**
   * Returns all events that are valid from `current` state.
   */
  getValidEvents(current: S): E[] {
    const stateTransitions = this.transitions[current];
    if (!stateTransitions) return [];
    return Object.keys(stateTransitions) as E[];
  }

  /**
   * Returns all reachable target states from `current` state.
   */
  getValidTargets(current: S): S[] {
    const stateTransitions = this.transitions[current];
    if (!stateTransitions) return [];
    return [...new Set(Object.values(stateTransitions) as S[])];
  }
}
