//import { isPreviewMode } from '@decentraland/EnvironmentAPI'

/**
 * Object with data for a NPCTriggerComponent
 * @public
 */
 export type TriggerData = {
  /**
   * layer of the Trigger, useful to discriminate between trigger events. You can set multiple layers by using a | symbol.
   */
  layer?: number
  /**
   * against which layers to check collisions
   */
  triggeredByLayer?: number
  /**
   * callback when an entity of a valid layer enters the trigger area
   */
  onTriggerEnter?: (entity: Entity) => void
  /**
   * callback when an entity of a valid layer leaves the trigger area
   */
  onTriggerExit?: (entity: Entity) => void
  /**
   * callback when the player enters the trigger area
   */
  onCameraEnter?: () => void
  /**
   * callback when the player leaves the trigger area
   */
  onCameraExit?: () => void
  /**
   * when true makes the trigger area visible for debug purposes.
   */
  enableDebug?: boolean
}


@Component('OriginTransformA')
 export class OriginTransform {
  entity:Entity;
  host:Entity;
  scene:IEntity;

  constructor(entity: Entity,host: Entity,scene: IEntity) {
    this.entity = entity
    this.host = host
    this.scene = scene
  }
 }

/**
 * @public
 */
 @Component('triggerComponentCE.AvatarSwap')
 export class TriggerComponentCE {
   /**
    * Is the trigger enabled? If false, the associated functions aren't triggered.
    */
   enabled: boolean = true
   /**
    * shape of the collider
    */
   shape: TriggerBoxShape | TriggerSphereShape
   /**
    * bit layer of the Tigger (usefull to discriminate between trigger events)
    */
   layer: number = 0
   /**
    * against which layer are we going to check trigger's collisions
    */
   triggeredByLayer: number = 0
   /**
    * callback when trigger is entered
    */
   onTriggerEnter?: (entity: Entity) => void
   /**
    * callback when trigger is exit
    */
   onTriggerExit?: (entity: Entity) => void
   /**
    * callback when trigger is entered
    */
   onCameraEnter?: () => void
   /**
    * callback when trigger is exit
    */
   onCameraExit?: () => void
   /**
    * get if debug is enabled
    */
   get debugEnabled(): boolean {
     return this._debugEnabled
   }
 
   private _debugEnabled: boolean = false
 
   /**
    * @param shape - shape of the triggering collider area
    * @param data - An object with additional parameters for the trigger component
    */
   constructor(shape: TriggerBoxShape | TriggerSphereShape, data?: TriggerData) {
     TriggerSystem.createAndAddToEngine()
     this.shape = shape
     if (data) {
       if (data.layer) this.layer = data.layer
       if (data.triggeredByLayer) this.triggeredByLayer = data.triggeredByLayer
       if (data.onTriggerEnter) this.onTriggerEnter = data.onTriggerEnter
       if (data.onTriggerExit) this.onTriggerExit = data.onTriggerExit
       if (data.onCameraEnter) this.onCameraEnter = data.onCameraEnter
       if (data.onCameraExit) this.onCameraExit = data.onCameraExit
       if (data.enableDebug) this._debugEnabled = data.enableDebug
     }
   }
 }
 
/**
 * @public
 */
export class TriggerSystem implements ISystem {
  private static _instance: TriggerSystem | null = null
  static get instance(): TriggerSystem {
    return this.createAndAddToEngine()
  }

  private _triggers: Record<string, TriggerWrapper> = {}
  private _cameraTriggerWrapper: CameraTrigger
  private _componentGroup: ComponentGroup

  private constructor() {
    log("TriggerSystem init")
    TriggerSystem._instance = this
    this._cameraTriggerWrapper = new CameraTrigger(
      new TriggerBoxShape(new Vector3(0.5, 1.8, 0.5), new Vector3(0, 0.91, 0))
    )

    this._componentGroup = engine.getComponentGroup(TriggerComponentCE)
    log("TriggerSystem this._componentGroup " + this._componentGroup .entities.length)
  }

  static createAndAddToEngine(): TriggerSystem {
    if (this._instance == null) {
      this._instance = new TriggerSystem()
      engine.addSystem(this._instance)
    }
    return this._instance
  }

  /**
   * set a custom trigger's shape for the camera
   * @param shape - custom trigger's shape
   */
  setCameraTriggerShape(shape: TriggerBoxShape | TriggerSphereShape) {
    this._cameraTriggerWrapper.setShape(shape)
  }

  update() {
    let entitiesWithTriggers = this._componentGroup.entities

    //iterate through all entities with triggers and wrap entities that weren't wrapped yet
    entitiesWithTriggers.forEach(entity => {
      if (this.shouldWrapTriggerEntity(entity)) {
        this.wrapTriggerEntity(entity)
      }
    })

    //iterate through wrapped entities
    for (const key in this._triggers) {
      if (this._triggers.hasOwnProperty(key)) {
        let wrapper = this._triggers[key]

        //update debug entity
        if (wrapper.isDebugging()) {
          wrapper.updateDebugEntity()
        }

        if (!wrapper.isInEngine()) {
          //remove debugging
          if (wrapper.isDebugging()) {
            wrapper.removeDebugEntity()
          }
          //remove old collisions
          TriggerSystem.removeTriggerFromSystem(wrapper)
          //remove from record
          delete this._triggers[key]
        } else if (wrapper.trigger != null && wrapper.trigger.enabled) {
          //if was set as enabled in last frame
          if (!wrapper.wasEnabled) {
            if (wrapper.isDebugging()) {
              wrapper.addDebugEntity()
            }
          }
          //set as enabled
          wrapper.wasEnabled = true

          //check collision camera
          if (wrapper.trigger.onCameraEnter || wrapper.trigger.onCameraExit) {
            this.checkCollisionAgainstCamera(wrapper)
          }

          //check collision with others
          if (wrapper.trigger.onTriggerEnter || wrapper.trigger.onTriggerExit) {
            this.checkCollisionAgainstOtherTriggers(wrapper)
          }
        } else if (wrapper.wasEnabled) {
          wrapper.wasEnabled = false
          //remove debugging
          if (wrapper.isDebugging()) {
            wrapper.removeDebugEntity()
          }
          TriggerSystem.removeTriggerFromSystem(wrapper)
        }
      }
    }
  }

  private shouldWrapTriggerEntity(entity: IEntity): boolean {
    return (
      this._triggers[entity.uuid] == undefined ||
      this._triggers[entity.uuid] == null
    )
  }

  private wrapTriggerEntity(entity: IEntity) {
    this._triggers[entity.uuid] = new TriggerWrapper(entity as Entity)
  }

  private static removeTriggerFromSystem(wrapper: TriggerWrapper) {
    let activeCollisions = wrapper.getActiveCollisions()
    for (let i = 0; i < activeCollisions.length; i++) {
      let activeCollisionHasTrigger = !(
        activeCollisions[i] ===
          TriggerSystem._instance?._cameraTriggerWrapper ||
        activeCollisions[i].trigger == null
      )

      if (
        activeCollisionHasTrigger &&
        activeCollisions[i].trigger.onTriggerExit &&
        wrapper.entity
      )
        (activeCollisions[i].trigger.onTriggerExit as (
          entity: IEntity
        ) => void)(wrapper.entity)
      activeCollisions[i].disengageActiveCollision(wrapper)
      wrapper.disengageActiveCollision(activeCollisions[i])
    }
  }

  private static disengageCollision(t1: TriggerWrapper, t2: TriggerWrapper) {
    t1.disengageActiveCollision(t2)
    t2.disengageActiveCollision(t1)

    if (t1.trigger.onTriggerExit && t2.entity)
      t1.trigger.onTriggerExit(t2.entity)
    if (t2.trigger.onTriggerExit && t1.entity)
      t2.trigger.onTriggerExit(t1.entity)
  }

  private static engageCollision(t1: TriggerWrapper, t2: TriggerWrapper) {
    t1.engageCollision(t2)
    t2.engageCollision(t1)

    if (t1.trigger.onTriggerEnter && t2.entity)
      t1.trigger.onTriggerEnter(t2.entity)
    if (t2.trigger.onTriggerEnter && t1.entity)
      t2.trigger.onTriggerEnter(t1.entity)
  }

  private checkCollisionAgainstCamera(wrapper: TriggerWrapper) {
    let wereColliding = wrapper.hasActiveCollision(this._cameraTriggerWrapper)
    let areColliding = TriggerSystem.areColliding(
      wrapper,
      this._cameraTriggerWrapper
    )

    if (wereColliding && !areColliding) {
      wrapper.disengageActiveCollision(this._cameraTriggerWrapper)
      if (wrapper.trigger.onCameraExit) wrapper.trigger.onCameraExit()
    } else if (!wereColliding && areColliding) {
      wrapper.engageCollision(this._cameraTriggerWrapper)
      if (wrapper.trigger.onCameraEnter) wrapper.trigger.onCameraEnter()
    }
  }

  private checkCollisionAgainstOtherTriggers(wrapper: TriggerWrapper) {
    for (const key in this._triggers) {
      if (this._triggers.hasOwnProperty(key)) {
        if (key != wrapper.uuid && this._triggers[key].trigger.enabled) {
          if (TriggerSystem.canTriggersCollide(wrapper, this._triggers[key])) {
            let wereColliding = wrapper.hasActiveCollision(this._triggers[key])
            let areColliding = TriggerSystem.areColliding(
              wrapper,
              this._triggers[key]
            )

            if (wereColliding && !areColliding)
              TriggerSystem.disengageCollision(wrapper, this._triggers[key])
            else if (!wereColliding && areColliding)
              TriggerSystem.engageCollision(wrapper, this._triggers[key])
          }
        }
      }
    }
  }

  private static canTriggersCollide(
    t1: TriggerWrapper,
    t2: TriggerWrapper
  ): boolean {
    if (t1.trigger.triggeredByLayer == 0) return true
    return (t2.trigger.layer & t1.trigger.triggeredByLayer) != 0
  }

  private static areColliding(t1: TriggerWrapper, t2: TriggerWrapper): boolean {
    if (
      t1.getShape() instanceof TriggerBoxShape &&
      t2.getShape() instanceof TriggerBoxShape
    ) {
      return TriggerSystem.areCollidingAABB(
        t1.getGlobalPosition(),
        t1.getShape() as TriggerBoxShape,
        t2.getGlobalPosition(),
        t2.getShape() as TriggerBoxShape
      )
    } else if (
      t1.getShape() instanceof TriggerSphereShape &&
      t2.getShape() instanceof TriggerSphereShape
    ) {
      return TriggerSystem.areCollidingSphere(
        t1.getGlobalPosition(),
        t1.getShape() as TriggerSphereShape,
        t2.getGlobalPosition(),
        t2.getShape() as TriggerSphereShape
      )
    } else if (
      t1.getShape() instanceof TriggerBoxShape &&
      t2.getShape() instanceof TriggerSphereShape
    ) {
      return TriggerSystem.areCollidingAABBSphere(
        t1.getGlobalPosition(),
        t1.getShape() as TriggerBoxShape,
        t2.getGlobalPosition(),
        t2.getShape() as TriggerSphereShape
      )
    } else if (
      t1.getShape() instanceof TriggerSphereShape &&
      t2.getShape() instanceof TriggerBoxShape
    ) {
      return TriggerSystem.areCollidingAABBSphere(
        t2.getGlobalPosition(),
        t2.getShape() as TriggerBoxShape,
        t1.getGlobalPosition(),
        t1.getShape() as TriggerSphereShape
      )
    }
    return false
  }

  private static areCollidingAABB(
    t1GlobalPosition: Vector3,
    t1Shape: TriggerBoxShape,
    t2GlobalPosition: Vector3,
    t2Shape: TriggerBoxShape
  ): boolean {
    let t1 = TriggerSystem.getBoxShapeValues(t1GlobalPosition, t1Shape)
    let t2 = TriggerSystem.getBoxShapeValues(t2GlobalPosition, t2Shape)
    return (
      t1.min.x <= t2.max.x &&
      t1.max.x >= t2.min.x &&
      t1.min.y <= t2.max.y &&
      t1.max.y >= t2.min.y &&
      t1.min.z <= t2.max.z &&
      t1.max.z >= t2.min.z
    )
  }

  private static areCollidingSphere(
    t1GlobalPosition: Vector3,
    t1Shape: TriggerSphereShape,
    t2GlobalPosition: Vector3,
    t2Shape: TriggerSphereShape
  ): boolean {
    let sqDist = Vector3.DistanceSquared(
      t1GlobalPosition.add(t1Shape.position),
      t2GlobalPosition.add(t2Shape.position)
    )
    return (
      sqDist < t1Shape.radius * t1Shape.radius + t2Shape.radius * t2Shape.radius
    )
  }

  private static areCollidingAABBSphere(
    t1GlobalPosition: Vector3,
    t1Shape: TriggerBoxShape,
    t2GlobalPosition: Vector3,
    t2Shape: TriggerSphereShape
  ): boolean {
    let box = TriggerSystem.getBoxShapeValues(t1GlobalPosition, t1Shape)
    let sphere = {
      center: t2GlobalPosition.add(t2Shape.position),
      radius: t2Shape.radius
    }

    let dmin = 0
    if (sphere.center.x < box.min.x)
      dmin += (box.min.x - sphere.center.x) * (box.min.x - sphere.center.x)
    if (sphere.center.x > box.max.x)
      dmin += (sphere.center.x - box.max.x) * (sphere.center.x - box.max.x)
    if (sphere.center.y < box.min.y)
      dmin += (box.min.y - sphere.center.y) * (box.min.y - sphere.center.y)
    if (sphere.center.y > box.max.y)
      dmin += (sphere.center.y - box.max.y) * (sphere.center.y - box.max.y)
    if (sphere.center.z < box.min.z)
      dmin += (box.min.z - sphere.center.z) * (box.min.z - sphere.center.z)
    if (sphere.center.z > box.max.z)
      dmin += (sphere.center.z - box.max.z) * (sphere.center.z - box.max.z)

    return dmin < sphere.radius * sphere.radius
  }

  private static getBoxShapeValues(
    entityGlobalPosition: Vector3,
    shape: TriggerBoxShape
  ): { center: Vector3; min: Vector3; max: Vector3 } {
    let center = entityGlobalPosition.add(shape.position)
    return {
      center: center,
      min: center.subtract(shape.size.scale(0.5)),
      max: center.add(shape.size.scale(0.5))
    }
  }
}

class TriggerWrapper {
  wasEnabled: boolean = true

  get entity(): Entity | undefined {
    return this._entity
  }
  get trigger(): TriggerComponentCE {
    return this._trigger
  }
  get uuid(): string {
    return this._uuid
  }

  protected _entity?: Entity
  protected _trigger!: TriggerComponentCE
  protected _uuid: string = ''
  protected _collidingWith: Record<string, TriggerWrapper> = {}

  private _isDebug: boolean = false
  private _debugEntity: Entity | null = null
  private static _debugMaterial: Material | null = null

  constructor(entity?: Entity) {
    log("trigger wrapper constructor " )
    this._entity = entity
    if (entity) {
      log("trigger wrapper constructor " + entity.name)
      this._trigger = entity.getComponent(TriggerComponentCE)
      this._uuid = entity.uuid
      this._isDebug = this._trigger.debugEnabled
      if (this._isDebug) {
        this.addDebugEntity()
      }
    }
  }

  getGlobalPosition(): Vector3 {
    if (this._entity) return TriggerWrapper.getEntityWorldPosition(this._entity)
    return Vector3.Zero()
  }

  getShape(): TriggerBoxShape | TriggerSphereShape {
    return this._trigger.shape
  }

  isInEngine(): boolean {
    return this._entity != null && this._entity.isAddedToEngine()
  }

  getActiveCollisions(): TriggerWrapper[] {
    let ret: TriggerWrapper[] = []

    for (const key in this._collidingWith) {
      if (this._collidingWith.hasOwnProperty(key)) {
        ret.push(this._collidingWith[key])
      }
    }
    return ret
  }

  hasActiveCollision(other: TriggerWrapper): boolean {
    return (
      this._collidingWith[other.uuid] != undefined &&
      this._collidingWith[other.uuid] != null
    )
  }

  disengageActiveCollision(other: TriggerWrapper) {
    delete this._collidingWith[other.uuid]
  }

  engageCollision(other: TriggerWrapper) {
    this._collidingWith[other.uuid] = other
  }

  isDebugging(): boolean {
    return this._isDebug
  }

  async addDebugEntity() {
    //if (await !isPreviewMode()) {
    //  return
    //}

    if (!TriggerWrapper._debugMaterial) {
      TriggerWrapper._debugMaterial = new Material()
      TriggerWrapper._debugMaterial.alphaTest = 0.5
    }

    if (this._debugEntity == null) {
      this._debugEntity = new Entity()

      const transform = new Transform()
      this._debugEntity.addComponent(transform)
      this._debugEntity.addComponent(TriggerWrapper._debugMaterial)

      if (this.getShape() instanceof TriggerBoxShape) {
        const shape = new BoxShape()
        shape.withCollisions = false
        this._debugEntity.addComponent(shape)
        transform.scale = (this.getShape() as TriggerBoxShape).size
      }
      if (this.getShape() instanceof TriggerSphereShape) {
        const shape = new SphereShape()
        shape.withCollisions = false
        this._debugEntity.addComponent(shape)
        let rad = (this.getShape() as TriggerSphereShape).radius
        transform.scale = new Vector3(rad, rad, rad)
      }
    }
    engine.addEntity(this._debugEntity)
  }

  removeDebugEntity() {
    if (this._debugEntity != null) engine.removeEntity(this._debugEntity)
  }

  updateDebugEntity() {
    if (this._debugEntity) {
      this._debugEntity.getComponent(
        Transform
      ).position = this.getGlobalPosition().add(this.getShape().position)
    }
  }

  private static getEntityWorldPosition(entity: IEntity): Vector3 {
    let entityPosition =  this.getEntityWorldPositionOrig(entity)

    if(entity){
      const transform =  entity.hasComponent(Transform) ? entity.getComponent(Transform) : null
      let originEntity = entity.hasComponent(OriginTransform) ? entity.getComponent(OriginTransform).entity : null
      let host = entity.hasComponent(OriginTransform) ? entity.getComponent(OriginTransform).host : null
      let scene = entity.hasComponent(OriginTransform) ? entity.getComponent(OriginTransform).scene : null
      //TODO put hack in
      if(originEntity&&scene&&host&&scene!==undefined&&scene!==null){
        let sceneRotEuler = scene.getComponent(Transform).rotation.eulerAngles
        const sceneparRotAbsY = sceneRotEuler.y >= 0 ? sceneRotEuler.y : sceneRotEuler.y + 360
        if( (sceneparRotAbsY > 81 && sceneparRotAbsY < 99) || (sceneparRotAbsY > 261 && sceneparRotAbsY < 279) || (sceneparRotAbsY > 171 && sceneparRotAbsY < 189)){
          //TODO only do if scene is rotated too
          
          let pos = entityPosition;//this.getEntityWorldPosition(key);
          
          let pos0 = this.getEntityWorldPositionOrig(originEntity)
          
          //TODO activate key and timer to turn off
          //grass.getComponent(Transform).position = pos.clone()
          //adjustForSceneRotation( grass.getComponent(Transform).position, key ) 
          let hostDist = host.getComponent(Transform).position.subtract(pos0)
          let relativeRotate = null;//pos.subtract(pos0).rotate( Quaternion.Euler(0, 90, 0) )
          //relativeRotate = relativeRotate.multiply(entity.getComponent(Transform).scale)
          
          let parentRotEuler = host.getComponent(Transform).rotation.eulerAngles
          
          
          //const parRotAbsX = Math.abs(parentRotEuler.x)
          const parRotAbsY = parentRotEuler.y >= 0 ? parentRotEuler.y : parentRotEuler.y + 360 ;//Math.abs(parentRotEuler.y)
          
          let scene180 = false
          let extraZBit = 0;
          let extraXBit = 0;
          if( (sceneparRotAbsY > 89 && sceneparRotAbsY < 91) ){
            relativeRotate = pos.subtract(pos0).rotate( Quaternion.Euler(0, 90, 0) )
            if(transform.scale.y<=2){
              extraZBit = .8  * transform.scale.y
              extraXBit = -.3 * transform.scale.y
            }else{
              extraZBit = .6  * transform.scale.y
              extraXBit = -.5 * transform.scale.y
            }
          }else if(sceneparRotAbsY > 269 && sceneparRotAbsY < 271){  
            relativeRotate = pos0.subtract(pos).rotate( Quaternion.Euler(0, 90, 0) )
            
            if(transform.scale.y<2){
              extraZBit = .1  * transform.scale.y
            }else{
              extraZBit = .35  * transform.scale.y
            }

            extraXBit = .6 * transform.scale.y
            if((parRotAbsY > 261 && parRotAbsY < 279)){
              extraXBit *= -1
              extraZBit *= -1
            }
          }else if((sceneparRotAbsY > 178 && sceneparRotAbsY < 182)){
            scene180 = true
            relativeRotate = pos0.subtract(pos).rotate( Quaternion.Euler(0, 180, 0) )
            if(transform.scale.y<2){
              extraZBit = .8  * transform.scale.y
            }else{
              extraZBit = .2  * transform.scale.y
            }
            if(transform.scale.y<2){
              extraXBit = .8  * transform.scale.y
            }else{
              extraXBit = 1 * transform.scale.y
            }
            //extraXBit = 0
          }else{//0
            extraZBit = .6  * transform.scale.y
            extraXBit = .5 * transform.scale.y
          }
          
          //log("sceneparRotAbsY " + sceneparRotAbsY)
          //when rotated piano rotated 90
          if(!scene180){
            if( (parRotAbsY > 81 && parRotAbsY < 99) || (parRotAbsY > 261 && parRotAbsY < 279) ){
              entityPosition.x = pos0.x + extraXBit
              entityPosition.z = pos0.z + relativeRotate.z + extraZBit
            }else if (parRotAbsY >=0 && parRotAbsY < 1){//non rotated host
              entityPosition.z = pos0.z + extraXBit
              entityPosition.x = pos0.x + relativeRotate.x - extraZBit
            }
          }else{
            if( (parRotAbsY > 81 && parRotAbsY < 99) || (parRotAbsY > 261 && parRotAbsY < 279) ){
              entityPosition.z = pos0.z + extraXBit
              entityPosition.x = pos0.x - relativeRotate.x + extraZBit
            }else{
              entityPosition.x = pos0.x - extraXBit
              entityPosition.z = pos0.z - relativeRotate.z + extraZBit
            }
          }
          
        }
      }
    }

    return entityPosition
  }

  private static getEntityWorldPositionOrig(entity: IEntity): Vector3 {
    let entityPosition = entity.hasComponent(Transform)
      ? entity.getComponent(Transform).position.clone()
      : Vector3.Zero()
    let parentEntity = entity.getParent()
    //ignoreing _scene from the math for some reason fixes my issue
    //but should it?  
    if (parentEntity != null && parentEntity.uuid != '0') { 
      let parentRotation = parentEntity.hasComponent(Transform) 
        ? parentEntity.getComponent(Transform).rotation 
        : Quaternion.Identity
 
      let toAdd = entityPosition.rotate(parentRotation);
      if(parentEntity.hasComponent(Transform)){
        toAdd = toAdd.multiply(parentEntity.getComponent(Transform).scale)
      }
        //TODO ADD multiply by scale
      return this.getEntityWorldPosition(parentEntity).add( toAdd )
    }
    return entityPosition
  }
}

class CameraTrigger extends TriggerWrapper {
  private _shape: TriggerBoxShape | TriggerSphereShape

  constructor(shape: TriggerBoxShape | TriggerSphereShape) {
    super()
    this._shape = shape
    this._uuid = 'cameraTrigger'
  }

  getGlobalPosition() {
    return Camera.instance.position
  }

  getShape() {
    return this._shape
  }

  setShape(shape: TriggerBoxShape | TriggerSphereShape) {
    this._shape = shape
  }

  isInEngine(): boolean {
    return false
  }

  hasActiveCollision(other: TriggerWrapper): boolean {
    return false
  }

  disengageActiveCollision(other: TriggerWrapper) {}

  engageCollision(other: TriggerWrapper) {}
  isDebugging(): boolean {
    return false
  }
}


/**
 * Define a box-shaped area for using on a TriggerComponent
 * @param size - The scale of the box area. By default 2x2x2
 * @param position - The offset from the position of the entity that owns the TriggerComponent
 * @public
 */
export class TriggerBoxShape {
  constructor(
    public size: Vector3 = Vector3.One().scale(2),
    public position: Vector3 = Vector3.Zero()
  ) {}
}

/**
 * Define a sphere-shaped area for using on a TriggerComponent
 * @param radius - The radius of the sphere area. By default 2
 * @param position - The offset from the position of the entity that owns the TriggerComponent
 * @public
 */
export class TriggerSphereShape {
  constructor(
    public radius: number = 2,
    public position: Vector3 = Vector3.Zero()
  ) {}
}
