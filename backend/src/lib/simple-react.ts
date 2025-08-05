export type Element = {
  type: string | ((props: any) => Element | string);
  props: Record<string, any> | null;
  children: Array<Element | string>;
};

export function createElement(
  type: Element['type'],
  props: Element['props'],
  ...children: Element['children']
): Element {
  return { type, props: props || null, children };
}

export function renderToStaticMarkup(node: Element | string): string {
  if (typeof node === 'string') {
    return node;
  }
  if (typeof node.type === 'function') {
    return renderToStaticMarkup(
      node.type({ ...(node.props || {}), children: node.children }),
    );
  }
  const attrs = node.props
    ? Object.entries(node.props)
        .map(([k, v]) => ` ${k}="${String(v)}"`)
        .join('')
    : '';
  const children = node.children.map(renderToStaticMarkup).join('');
  return `<${node.type}${attrs}>${children}</${node.type}>`;
}