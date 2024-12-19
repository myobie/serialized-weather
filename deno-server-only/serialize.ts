/*
 * IMPORTANT: this intentionally doesn't know anything about shadow dom. This
 * entire project only uses the light dom to keep things simple. The goal is to
 * show how server-side serialization can work and is viable today. Shadow dom
 * serialization is possible, but it does add noise and would get in the way of
 * simply illustrating server-side serialization.
 */

// see: https://developer.mozilla.org/en-US/docs/Glossary/Void_element
const voidElementNames = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]

export async function* serializerAsync(
  node: Node | Node[]
): AsyncGenerator<string, void, void> {
  if (Array.isArray(node)) {
    for (const n of node) {
      yield* serializerAsync(n)
    }
    return
  }

  // NOTE: document fragment
  if (node.nodeType === 11) {
    yield* serializerAsync(Array.from((node as DocumentFragment).children))
    return
  }

  // NOTE: document
  if (node.nodeType === 9) {
    yield* serializerAsync((node as Document).documentElement)
    return
  }

  // NOTE: comment
  if (node.nodeType === 8) {
    yield node.toString()
    return
  }

  // NOTE: text node
  if (node.nodeType === 3) {
    yield node.nodeValue || ''
    return
  }

  // NOTE: element
  if (node.nodeType === 1) {
    const el = node as Element
    const tagName = el.tagName.toLowerCase()

    // NOTE: this is my convention for an element to delay its own
    // serialization by returning a Promise from isReady
    if ('isReady' in el) {
      try {
        await el.isReady
      } catch (e) {
        if (e === 'timeout') {
          console.error(`isReady took too long for ${tagName}`)
        } else {
          console.error(`Caught error waiting for isReady for ${tagName}`)
          console.error(e)
        }
      }
    }

    const attributes = new Map()

    if (el.hasAttributes()) {
      for (const attr of Array.from(el.attributes).sort()) {
        attributes.set(attr.name, attr.value)
      }
    }

    // NOTE: This is very naive
    const attributesArray = Array.from(attributes.entries()).map(([k, v]) => `${k}="${v}"`)
    const attributesString = attributesArray.length > 0 ? ` ${attributesArray.join(' ')}` : ''

    // NOTE: yield this node's tag name + attributes
    // This probably only works for simple HTML5 and I'm OK with that for now
    yield `<${tagName}${attributesString}>`

    // NOTE: serialize the children
    yield* serializeChildrenOfNode(el)

    // html5!
    if (!voidElementNames.includes(tagName)) {
      yield `</${tagName}>`
    }
    return
  }

  console.warn('missing nodeType', node.nodeType, node.nodeName)
}

async function* serializeChildrenOfNode(parent: Element | ShadowRoot) {
  const children = Array.from(parent.childNodes)

  for (const child of children) {
    yield* serializerAsync(child)
  }
}

// FIXME: there should be one root level timeout, not a timeout that we pass down all the time
export async function serializeAsync(node: Node | Node[]) {
  let buffer = ''

  for await (const string of serializerAsync(node)) {
    buffer += string
  }

  return buffer
}
