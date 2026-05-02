/**
 * `@Method` — moves the decorated method onto the service's `methods`
 * field. Methods are bound to the service instance at runtime and
 * accessible as `this.<methodName>(...)` from action/event/channel
 * handlers (and from the service lifecycle hooks).
 *
 *     @Method
 *     helper(x: number) { return x + 1; }
 */
export function Method(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
): void {
  const methods = (target.methods ??= {});
  methods[propertyKey] = descriptor.value;
}
