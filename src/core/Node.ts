import Scene from "./Scene";
import TransManager from "../core/TransManager";
import ArenaStore from "./ArenaStore";

export default class Node {
  private _id: string;
  private _name: string;
  private _parent: Node | undefined | null;
  private _children: Record<string, Node>;
  private _scenes: Record<string, Scene>;
  private _dirtyScenes: Record<string, boolean>;
  private _dirtySceneKeys: Record<string, Record<string, boolean>>;
  private _dirtyNodes: Record<string, boolean>;
  private _isDestroyed: boolean;
  private _arenaStore: ArenaStore;

  constructor(id: string, name: string, arenaStore: ArenaStore, parent?: Node) {
    this._id = id;
    this._name = name;
    this._parent = parent;
    this._scenes = {};
    this._children = {};
    this._dirtyNodes = {};
    this._dirtyScenes = {};
    this._dirtySceneKeys = {};
    this._isDestroyed = false;
    this._arenaStore = arenaStore;
  }

  getId() {
    return this._id;
  }

  isDestroyed() {
    return this._isDestroyed;
  }

  getParent() {
    return this._parent;
  }

  destroy(): null | string[] {
    if (this._isDestroyed !== true) {
      this._isDestroyed = true;
      Object.values(this._scenes).forEach(scene => scene.destroy());
      let nodeKeys = Object.keys(this._children);
      return Object.entries(this._children)
        .map(([key, child]) => child.destroy())
        .reduce(
          (prev, cur) => (cur == null ? prev : (prev as string[]).concat(cur)),
          nodeKeys
        );
    }
    return null;
  }

  commit() {
    if (this._isDestroyed !== true) {
      Object.keys(this._dirtyNodes).forEach(nodeId =>
        this._children[nodeId].commit()
      );
      Object.keys(this._dirtyScenes).forEach(sceneName =>
        this._scenes[sceneName].commit()
      );
      let dirtyScenes = this._dirtySceneKeys;
      this._dirtyNodes = {};
      this._dirtyScenes = {};
      this._dirtySceneKeys = {};
      this._arenaStore.updateDirtyNode(this._id, dirtyScenes);
    }
  }

  addDirtyScenes(sceneName: string) {
    if (this._isDestroyed !== true) {
      this._dirtyScenes[sceneName] = true;
      if (this._parent != null) {
        this._parent.addDirtyNode(this._id);
      }
    }
  }

  addDirtyNode(nodeId: string) {
    if (this._isDestroyed !== true) {
      this._dirtyNodes[nodeId] = true;
    }
  }

  updateDirtyScene(sceneName: string, keyList: Record<string, boolean>) {
    if (this._isDestroyed !== true) {
      this._dirtySceneKeys[sceneName] = keyList;
    }
  }

  addScene<S extends Record<string, {}>, A>(
    sceneName: string,
    RawScene: new () => any
  ) {
    if (this._scenes[sceneName] != null && this._isDestroyed !== true) {
      throw new Error(
        `Error occurred while adding scene to node [${
          this._id
        }], scene [${sceneName}] already exist.`
      );
    }
    let scene = new Scene(sceneName, RawScene, this);
    this._scenes[sceneName] = scene;
    return scene;
  }

  deleteScene(sceneName: string) {
    let scene = this._scenes[sceneName];
    if (this._scenes[sceneName] == null && this._isDestroyed !== true) {
      throw new Error(
        `Error occurred while deleting scene to node [${
          this._id
        }], scene [${sceneName}] is not exist.`
      );
    }
    scene.destroy();
    delete this._scenes[sceneName];
    return scene;
  }

  mountChild(id: string, node: Node) {
    if (this._isDestroyed !== true) {
      if (this._children[id] != null) {
        throw new Error(
          `Error occurred while mounting node [${this._id}], child [${{
            id
          }}] already exist.`
        );
      }
      this._children[id] = node;
      return node;
    }
    return null;
  }

  unmountChild(nodeId: string) {
    if (this._isDestroyed !== true) {
      let child = this._children[nodeId];
      if (child == null) {
        throw new Error(
          `Error occurred while unmounting in node [${
            this._id
          }], child [${nodeId}] does not exist.`
        );
      }
      delete this._children[nodeId];
      return child;
    }
    return null;
  }

  hasChild(nodeId: string) {
    if (this._isDestroyed !== true) {
      return this._children[nodeId] != null;
    }
    return false;
  }

  getTransManager() {
    if (this._isDestroyed !== true) {
      return this._arenaStore.getTransManager();
    }
    return null;
  }

  getScenes() {
    return this._scenes;
  }
  
  getSceneEntity(sceneName: string) {
    if (this._isDestroyed !== true) {
      let scene = this._scenes[sceneName];
      if (scene == null) {
        throw new Error(
          `Error occurred while getting scene, scene [${{
            sceneName
          }}] does not exist in node [${this._id}].`
        );
      }
      return scene.getEntity();
    }
    return null;
  }
}
