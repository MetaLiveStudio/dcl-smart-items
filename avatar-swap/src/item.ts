import { Arissa, OFFSET, INSTANCES_LILDODGE } from './arissa'
import * as utils from './decentralandecsutils/triggers/triggerSystem'
import {getEntityByName} from './utils'
import config from './config'

export type Props = {
  onEnter?: Actions
  onLeave?: Actions
  enabled: boolean
  debugTriggers?: boolean
  entireScene?: boolean
  whenActiveHideWho?: string
  enableAnimatorClips?: boolean
  fixedOrigin?: string
  fixedArea?: string
  sceneDimensions?:string 
  relative?: boolean
  
  playerMovingCheckInterval?: number
}

export type PrepareHostForTriggerResult = {
  areaDimSource:Vector3
  absTriggerAreaDims: Vector3
  triggerAreaDims:Vector3
  triggerPos: Vector3
}

//TODO remove _scene and just loop up host to find
export function prepareHostForTrigger(_scene:IEntity,host:Entity,entireScene:boolean,relative:boolean,sceneDimensions?:string,fixedArea?:string,fixedOrigin?:string):PrepareHostForTriggerResult{

  let areaDimSource = host.getComponent(Transform).scale.clone()

  if(fixedArea !== null && fixedArea !== undefined && fixedArea.split(",").length==3 ){
    let fixedAreaArr = fixedArea.split(",")
    areaDimSource = new Vector3( +fixedAreaArr[0],+fixedAreaArr[1],+fixedAreaArr[2] )
  }
  
  if( entireScene ){
    //TODO figure out how to get scene size
    //areaDimSource = new Vector3( 16,16,16 )
    if(sceneDimensions !== null && sceneDimensions !== undefined && sceneDimensions.split(",").length==3 ){
      let fixedAreaArr = sceneDimensions.split(",")
      areaDimSource = new Vector3( +fixedAreaArr[0],+fixedAreaArr[1],+fixedAreaArr[2] )

      log("XXXareaDimSource" + areaDimSource)

      //move to center so can take up entire area
      host.getComponent(Transform).position.x = areaDimSource.x/2
      host.getComponent(Transform).position.y = 0 
      host.getComponent(Transform).position.z = areaDimSource.z/2

      host.getComponent(Transform).scale = Vector3.One()
    }else{
      //idk?
      log("sceneDimensions is required for entireScene setting");
    }
    
  }
  
  const triggerAreaDims = new Vector3().copyFrom( areaDimSource )
  const hostPos = new Vector3().copyFrom( host.getComponent(Transform).position )

  let triggerPos = new Vector3(0, triggerAreaDims.y/2, 0)  

  if(fixedOrigin !== null && fixedOrigin !== undefined && fixedOrigin.split(",").length==3 ){
    let fixedOriginArr = fixedOrigin.split(",")
    if( relative !==null && relative !== undefined && relative ){
      triggerPos.add(new Vector3( +fixedOriginArr[0],+fixedOriginArr[1],+fixedOriginArr[2] ))
    }else{
      //absolute
      triggerPos = new Vector3( +fixedOriginArr[0],+fixedOriginArr[1],+fixedOriginArr[2] )
    }
  }

  log("avatarswap " + host.name + " dimension " + areaDimSource + " " + triggerAreaDims + " " +  triggerPos + " " );

  const hostTransform = host.getComponent(Transform)
  const hostYRotationEuler = hostTransform.rotation.eulerAngles
  const hostYRotation = hostYRotationEuler.y >= 0 ? hostYRotationEuler.y : hostYRotationEuler.y + 360

  log("HOST " + host.name + " " +  host.getComponent(Transform).rotation.eulerAngles + " " + hostYRotation)

  let sceneRotEuler = Vector3.Zero();
  let sceneRot = null
  let scenePos = null
  if(_scene && _scene !== undefined ){
    sceneRot = _scene.getComponent(Transform).rotation
    scenePos = _scene.getComponent(Transform).position
    sceneRotEuler = sceneRot.eulerAngles
  }
  const sceneparRotAbsY = sceneRotEuler.y >= 0 ? sceneRotEuler.y : sceneRotEuler.y + 360
  
  log("scene rotation info.4 " + scenePos + " " + sceneRot + " "  + sceneRotEuler + " " + sceneparRotAbsY);

  const absTriggerAreaDims = new Vector3().copyFrom(triggerAreaDims)
  if(hostYRotation > 81 && hostYRotation < 99 || hostYRotation > 261 && hostYRotation < 289){
      if( (sceneparRotAbsY > 81 && sceneparRotAbsY < 99) || (sceneparRotAbsY > 261 && sceneparRotAbsY < 279) ){
        //if rotated, leave rotation
      }else{
        triggerAreaDims.rotate( Quaternion.Euler(0,90,0) )
        log("triggerAreaDims.postRotate " + triggerAreaDims)
      }
  }else{//for host zero need to counter it
    if( (sceneparRotAbsY > 81 && sceneparRotAbsY < 99) || (sceneparRotAbsY > 261 && sceneparRotAbsY < 279) ){
      triggerAreaDims.rotate( Quaternion.Euler(0,90,0) )
      log("triggerAreaDims.postRotate " + triggerAreaDims)
    }else{
      //scene 0 = host = 0 leave
    }
  }

  triggerAreaDims.x = Math.abs(triggerAreaDims.x)
  triggerAreaDims.y = Math.abs(triggerAreaDims.y)
  triggerAreaDims.z = Math.abs(triggerAreaDims.z)

  const result:PrepareHostForTriggerResult = {
    triggerAreaDims: triggerAreaDims,
    triggerPos: triggerPos,
    absTriggerAreaDims: absTriggerAreaDims,
    areaDimSource:areaDimSource
  }
  return result;
}

export default class AvatarSwap implements IScript<Props> {
  _scene:IEntity

  // Check if player is moving
  currentPosition = new Vector3()
  arissa:Arissa
  arissaIdle:Arissa
  instances: Record<string, Arissa[]> = {}
  followAreaModifier: Entity
  avatarAttachable:boolean

  init() {
    this._scene = getEntityByName('_scene')

    //checking for sdk +6.4 (builder runs 6.6.3)
    const runningSdk664OrHigher = typeof onSceneReadyObservable !== 'undefined'
    //checking if in builder. builder has no scene object and no avatar to attach to TODO find more definitive way to tell
    const inBuider = (this._scene===null || this._scene === undefined)
    const avatarAttachable = !inBuider
    this.avatarAttachable = avatarAttachable
    log("avatarswap avatarAttachable " + avatarAttachable )
    
    log("avatarswap onSceneReadyObservable ")
    log("avatarswap onSceneReadyObservable: local check "+ runningSdk664OrHigher + " vs " + config.CONSTANTS.SDK_664_OR_HIGHER)

    log("avatarswap avatarAttachable " + avatarAttachable )
    //DO NOT SHARE transforms
    //TODO create GLTF cache/ init arisa in spawn because need the instance params    
    // Arissa
    this.arissa = new Arissa( INSTANCES_LILDODGE,
      new GLTFShape('models/Lildoge_run.gltf'),
      new Transform({
        position: new Vector3().copyFrom(OFFSET[INSTANCES_LILDODGE]),
        scale: new Vector3(0, 0, 0),
      }), false, null
    )
    this.arissaIdle = new Arissa( INSTANCES_LILDODGE,
      new GLTFShape('models/Lildoge_Idle.gltf'),
      new Transform({
        position: new Vector3().copyFrom(OFFSET[INSTANCES_LILDODGE]),
        scale: new Vector3(0, 0, 0),
      }), false, null
    )

    this.instances[INSTANCES_LILDODGE]=[this.arissaIdle,this.arissa];

    const avatarModifierAreaComp = new AvatarModifierArea({
      area: { box: new Vector3(.5,1,.5) },
      modifiers: [AvatarModifiers.HIDE_AVATARS]
    })
    
    const areaModifierWrapper = new Entity('following-area-modifier' + "-avatar-modifier"); 
    this.followAreaModifier = areaModifierWrapper
    areaModifierWrapper.addComponent(avatarModifierAreaComp)
    areaModifierWrapper.addComponent(
      new Transform({
        position: new Vector3(0,0,0)})
    )
    engine.addEntity(areaModifierWrapper)

    if(avatarAttachable){
      this.arissaIdle.setParent(Attachable.AVATAR)
      this.arissa.setParent(Attachable.AVATAR)
      areaModifierWrapper.setParent(Attachable.AVATAR);
    }else{//constructor attaches it
      //engine.addEntity(this.arissaIdle)
    }

    const currentPosition = this.currentPosition;
    const instances = this.instances;
    const followAreaModifier = this.followAreaModifier
    
    class CheckPlayerIsMovingSystem implements ISystem {
      counter:number = 0
      update(dt: number) {
        //log(dt)
        this.counter += dt
        //check every .11 or more seconds
        if(this.counter >= config.CONSTANTS.PLAYER_MOVING_CHECK_INTERVAL){
          this.counter = 0 // reset counter
          const playerIdle = currentPosition.equals(Camera.instance.position)
          if(!playerIdle){
            currentPosition.copyFrom(Camera.instance.position)
          }
          for(const p in instances){
            const arissaIdle = instances[p][0];
            const arissa = instances[p][1];
            
            //TODO loop over all of them
            if (playerIdle) {
              arissa.hide()
              arissaIdle.playIdle()
            } else {
              if(!avatarAttachable){
                //manually update position
                arissa.updatePosition(currentPosition)
                arissaIdle.updatePosition(currentPosition)
              }
              arissa.playRunning()
              arissaIdle.hide()
            }
          }
          if (!playerIdle) {
            if(!avatarAttachable && followAreaModifier){
              //manually update position
              //followAreaModifier.updatePosition(currentPosition)
              const followAreaTransform = followAreaModifier.getComponent(Transform)
              followAreaTransform.position.x = currentPosition.x;// + OFFSET[this.instanceType].x
              followAreaTransform.position.y = currentPosition.y;// + OFFSET[this.instanceType].y
              followAreaTransform.position.z = currentPosition.z;//+ OFFSET[this.instanceType].z
            }
          }
        }
      }
    }
    engine.addSystem(new CheckPlayerIsMovingSystem())
  }

  spawn(host: Entity, props: Props, channel: IChannel) {
    const entireScene = props.entireScene !==null && props.entireScene !== undefined && props.entireScene 
 
    const whenActiveHideAllPlayers = props.whenActiveHideWho !== null && props.whenActiveHideWho !== undefined && props.whenActiveHideWho == 'all'
    const whenActiveHideCurrentPlayer = props.whenActiveHideWho !== null && props.whenActiveHideWho !== undefined && props.whenActiveHideWho == 'current'

    const prepareHostForTriggerResult = prepareHostForTrigger(this._scene,host,entireScene,props.relative,props.sceneDimensions,props.fixedArea,props.fixedOrigin)

    const triggerAreaDims = prepareHostForTriggerResult.triggerAreaDims
    const areaDimSource = prepareHostForTriggerResult.areaDimSource
    const absTriggerAreaDims = prepareHostForTriggerResult.absTriggerAreaDims
    const triggerPos = prepareHostForTriggerResult.triggerPos

    const trigger = new utils.TriggerBoxShape(
      triggerAreaDims.clone(),
      //new Vector3(hostPos.x-triggerAreaDims.x, triggerAreaDims.y/2, hostPos.z-triggerAreaDims.z)
      triggerPos
    )
    
    log("XXXabsTriggerAreaDims " + absTriggerAreaDims)
    log("XXXtriggerAreaDims " + triggerAreaDims)
    //trigger.enabled = props.enabled

    config.CONSTANTS.DEBUG_ENABLED = props.debugTriggers !==null && props.debugTriggers !== undefined && props.debugTriggers 
    config.CONSTANTS.PLAYER_MOVING_CHECK_INTERVAL = props.playerMovingCheckInterval !==null && props.playerMovingCheckInterval !== undefined ? props.playerMovingCheckInterval : config.CONSTANTS.PLAYER_MOVING_CHECK_INTERVAL


    const enabled = props.enabled !==null && props.enabled !== undefined && props.enabled 
    // Hide avatars
    //const hideAvatarsEntity = new Entity()
    log("XXXwhenActiveHideAllPlayers " + whenActiveHideAllPlayers + " " + props.whenActiveHideWho)
    log("XXXwhenActiveHideCurrentPlayer " + whenActiveHideCurrentPlayer)
    if(enabled && whenActiveHideAllPlayers){
      log("XXXadding hide avatar modifier")
      const modifierArea = absTriggerAreaDims.clone();
        modifierArea.y -= 1.6/2
        let avatarModifierAreaComp = new AvatarModifierArea({
          area: { box: modifierArea },
          modifiers: [AvatarModifiers.HIDE_AVATARS]
        })

        //centers itself in the host. if host is at 0, half of it is underground
        //for now going to move it up by half
        let avatarModifierPosition = new Vector3(0,0,0)
        avatarModifierPosition.y = (absTriggerAreaDims.y/2) - 1.6
        
        log("XXXavatarModifierPosition " + avatarModifierPosition);
        
        const areaModifierWrapper = new Entity(host.name + "-avatar-modifier"); 
        //engine.addEntity(areaModifierWrapper)
        areaModifierWrapper.setParent(host);
        areaModifierWrapper.addComponent(avatarModifierAreaComp)
        areaModifierWrapper.addComponent(
          new Transform({
            position: avatarModifierPosition})
        )
        
        //host.addComponent(avatarModifierAreaComp)
    }
    if(!enabled || !whenActiveHideCurrentPlayer){
      log("XXXdisable hide entity following")
      this.followAreaModifier.setParent(null)
      this.followAreaModifier.getComponent(Transform).scale.setAll(0)
      this.followAreaModifier = null
    }

    const currentPosition = this.currentPosition;  
    //TODO pick by avatar type
    const arissa = this.arissa;
    const arissaIdle = this.arissaIdle;
    const followAreaModifier = this.followAreaModifier
    const avatarAttachable = this.avatarAttachable
    
    // Create to show Arissa avatar
    if(enabled){
      host.addComponent(
        new utils.TriggerComponentCE(trigger, 
          {
            onCameraEnter: () => {
              arissa.enable()
              arissaIdle.enable()
              if(avatarAttachable && followAreaModifier){
                followAreaModifier.setParent(Attachable.AVATAR);
              }
            },
            onCameraExit: () => {
              arissa.disable()
              arissaIdle.disable()
              if(avatarAttachable && followAreaModifier){
                followAreaModifier.setParent(null)
              }
            },
            enableDebug : config.CONSTANTS.DEBUG_ENABLED
          }
        )
        
      )
    }else{
      log("avatarswap disabled")
    }

  }
}
