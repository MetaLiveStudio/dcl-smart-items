//import { Quaternion } from 'decentraland-ecs'
//import { Entity } from 'decentraland-ecs'
import * as utils from './decentralandecsutils/triggers/triggerSystem'
import { PianoKey, keys } from './pianoKey'
import resources from './resources'
import {getEntityByName} from './utils'
import config from './config'

export type Props = {
  enabled: boolean,
  visible?: boolean,
  visibleCasing?: boolean,
  keysWithCollisions?: boolean,
  debugTriggers?: boolean,
  enabledClickSound?: boolean,
  scaleKeysToFitInHostBoundary?: boolean
  enableClickable?: boolean
  numberOfOctaves?: number
  numberOfKeys?: number
  visibleNaturalKeys?: boolean,
  naturalToneKeyYOffset?: number,
  naturalToneKeyLength?: number
  visibleFlatSharpKeys?: boolean,
  flatSharpKeyLength?: number
  naturalToneKeyColor: string,
  naturalToneKeyGlowColor: string,
  naturalToneKeyEmissiveIntensity?: number
  flatSharpKeyColor: string
}

const ROTATION_Q_90_90_0_E:Quaternion = new Quaternion(0.5, 0.5, -0.5, 0.500000000000000);


  // White keys
  const whiteKeySounds: AudioClip[] = [
    resources.sounds.whiteKeys.c3,
    resources.sounds.whiteKeys.d3,
    resources.sounds.whiteKeys.e3,
    resources.sounds.whiteKeys.f3,
    resources.sounds.whiteKeys.g3,
    resources.sounds.whiteKeys.a3,
    resources.sounds.whiteKeys.b3,
    resources.sounds.whiteKeys.c4,
    resources.sounds.whiteKeys.d4,
    resources.sounds.whiteKeys.e4,
    resources.sounds.whiteKeys.f4,
    resources.sounds.whiteKeys.g4,
    resources.sounds.whiteKeys.a4,
    resources.sounds.whiteKeys.b4,
  ].reverse()
    


// Black keys
const blackKeySounds: AudioClip[] = [
  resources.sounds.blackKeys.cSharp3,
  resources.sounds.blackKeys.dSharp3,
  resources.sounds.blackKeys.fSharp3,
  resources.sounds.blackKeys.gSharp3,
  resources.sounds.blackKeys.aSharp3,
  resources.sounds.blackKeys.cSharp4,
  resources.sounds.blackKeys.dSharp4,
  resources.sounds.blackKeys.fSharp4,
  resources.sounds.blackKeys.gSharp4,
  resources.sounds.blackKeys.aSharp4,
].reverse()


//let grass = new Entity('grass')
    
export default class Piano implements IScript<Props> {
  model = new GLTFShape("models/baseScene-exact-dim.glb")
  parentId: number = 0
  _scene:IEntity

  init() {
    log("piano initialized")
    // Modify player's trigger shape
    utils.TriggerSystem.instance.setCameraTriggerShape(
      new utils.TriggerBoxShape(
        new Vector3(0.5, 0.25, 0.5),
        new Vector3(0, -0.5, 0)
      )
    )

    this._scene = getEntityByName('_scene')

  }

  toggle(entity: Entity, value: boolean) {
    
  }

  spawn(host: Entity, props: Props, channel: IChannel) {
    /*const entity = new Entity(host.name + '-floor-piano')
    //engine.addEntity(entity)
    
    entity.setParent(host)

    entity.addComponent(
      new Transform({
        position: new Vector3(0, 0, 0),
        scale: new Vector3(1, 1, 1),
        //rotation: Quaternion.Euler(0, 90, 0),
        rotation: Quaternion.Euler(0, 0, 0),
      }
    ));*/
    const entity = host

    config.CONSTANTS.DEBUG_ENABLED = props.debugTriggers !==null && props.debugTriggers !== undefined && props.debugTriggers 

    const hostTransform = host.getComponent(Transform)
    const hostYRotationEuler = hostTransform.rotation.eulerAngles
    const hostYRotation = hostYRotationEuler.y >= 0 ? hostYRotationEuler.y : hostYRotationEuler.y + 360

    log("HOST " + host.name + " " +  host.getComponent(Transform).rotation.eulerAngles + " " + hostYRotation)

    let sceneRotEuler = Vector3.Zero();
    let sceneRot = null
    let scenePos = null
    if(this._scene && this._scene !== undefined ){
      sceneRot = this._scene.getComponent(Transform).rotation
      scenePos = this._scene.getComponent(Transform).position
      sceneRotEuler = sceneRot.eulerAngles
    }
    const sceneparRotAbsY = sceneRotEuler.y >= 0 ? sceneRotEuler.y : sceneRotEuler.y + 360
    
    log("scene rotation info.4 " + scenePos + " " + sceneRot + " "  + sceneRotEuler + " " + sceneparRotAbsY);
    
    //const entity = host
    if(props.visibleCasing !==null && props.visibleCasing !== undefined && props.visibleCasing){
      let pianoCasing = new Entity(host.name + '-piano-casing')
      //engine.addEntity(entity)
      
      pianoCasing.setParent(entity)

      pianoCasing.addComponent(
        new Transform({
          position: new Vector3(0, 0, 0),
          scale: new Vector3(1, 1, 1),
          rotation: Quaternion.Euler(0, 90, 0),
        }
      ))
      pianoCasing.addComponent(this.model);
    }
    //store current parentid and increment at same time
    const thisParentId = this.parentId++;
    //init this parents key array
    //TODO use push?
    keys[thisParentId] = []

    const keyShape = new PlaneShape()
    keyShape.withCollisions = props.keysWithCollisions !==null && props.keysWithCollisions !== undefined ? props.keysWithCollisions : true

    const KEYS_PER_OCTAVE = 7
    const whiteKeyXPosStart = 0
    let whiteKeyXPos = whiteKeyXPosStart
    
    //scaleKeysToFitInHostBoundary flag here to be used later
    //for now scaleKeysToFitInHostBoundary=true means if you ask for more than 2 octaves
    //it will extend outsite the host boundaries.  
    //if scaleKeysToFitInHostBoundary = true, it will fit them in host boundaries, 
    //scaleKeysToFitInHostBoundary = false will be fixed size and created out till all keys rendered
    const scaleKeysToFitInHostBoundary:boolean = props.scaleKeysToFitInHostBoundary ? props.scaleKeysToFitInHostBoundary : true
    let numberOfOctaves:number = props.numberOfOctaves && props.numberOfOctaves > 0 ? props.numberOfOctaves : 2
    let numberOfKeys:number = props.numberOfKeys && props.numberOfKeys > 0 ? props.numberOfKeys : -1
    let naturalToneKeyEmissiveIntensity:number = props.naturalToneKeyEmissiveIntensity && props.naturalToneKeyEmissiveIntensity >= 0 ? props.naturalToneKeyEmissiveIntensity : 1
    let blackToneKeyEmissiveIntensity:number = naturalToneKeyEmissiveIntensity

    let numberOfWhiteKeys = numberOfKeys;
    let numberOfBlackKeys = numberOfKeys;
    //if numberOfKeys > 0 use that
    if(numberOfKeys < 0){
      numberOfWhiteKeys = numberOfOctaves * KEYS_PER_OCTAVE
      numberOfBlackKeys = numberOfOctaves * 5
    }else{
      numberOfOctaves = numberOfKeys / KEYS_PER_OCTAVE
      numberOfBlackKeys = numberOfKeys / KEYS_PER_OCTAVE * 5
    }
    
    const whiteKeyTransparent:boolean = props.naturalToneKeyColor && props.naturalToneKeyColor != 'transparent' ? false : true
    const blackKeyTransparent:boolean = props.flatSharpKeyColor && props.flatSharpKeyColor != 'transparent' ? false : true
    const whiteKeyColor:Color3 = getColorFromString(props.naturalToneKeyColor,Color3.White())
    const blackKeyColor:Color3 = getColorFromString(props.flatSharpKeyColor,Color3.Black())
    const whiteKeyGlowColor:Color3 = getColorFromString(props.naturalToneKeyGlowColor,new Color3(1.75, 1.25, 0.0))
    const blackKeyGlowColor = whiteKeyGlowColor
    //props.naturalToneKeyLength = 4
    //props.flatSharpKeyLength = 2

    const whiteKeyLen: number = props.naturalToneKeyLength && props.naturalToneKeyLength > 0 ? props.naturalToneKeyLength : 4
    const blackKeyLen: number = props.flatSharpKeyLength && props.flatSharpKeyLength > 0 ? props.flatSharpKeyLength : 2
    const enableSound: boolean = props.enabledClickSound !==null && props.enabledClickSound !== undefined && props.enabledClickSound
    const whiteKeyYOffset: number = props.naturalToneKeyYOffset && props.naturalToneKeyYOffset >= 0 ? props.naturalToneKeyYOffset : 0.11

    let triggerWhitePianoKey= resources.trigger.triggerWhitePianoKey
    let triggerBlackPianoKey= resources.trigger.triggerBlackPianoKey

    //HACKY WOOF
    if(hostYRotation > 81 && hostYRotation < 99 || hostYRotation > 261 && hostYRotation < 289){
      if( (sceneparRotAbsY > 81 && sceneparRotAbsY < 99) || (sceneparRotAbsY > 261 && sceneparRotAbsY < 279) ){
        //if rotated, leave rotation
      }else{
        triggerWhitePianoKey= resources.trigger.triggerWhitePianoKey90
        triggerBlackPianoKey= resources.trigger.triggerBlackPianoKey90
      }
    }else{//for host zero need to counter it
      if( (sceneparRotAbsY > 81 && sceneparRotAbsY < 99) || (sceneparRotAbsY > 261 && sceneparRotAbsY < 279) ){
        triggerWhitePianoKey= resources.trigger.triggerWhitePianoKey90
        triggerBlackPianoKey= resources.trigger.triggerBlackPianoKey90
      }else{
        //scene 0 = host = 0 leave
      }
    }
    const KEY_DIR = -1
    //triggerWhitePianoKey.name = 'trigger-shape'
    //props.enableClickable = true
    //props.visibleFlatSharpKeys = true
    log("numberOfKeys " + numberOfKeys + " " + numberOfWhiteKeys + "/"+ numberOfBlackKeys + " numberOfOctaves: " + numberOfKeys +  " scaleKeysToFitInHostBoundary:" + scaleKeysToFitInHostBoundary)
    log("whiteKeyLen " + whiteKeyLen + " blackKeyLen: " + blackKeyLen)

    let whiteKeyCount = 0
    if(props.visibleNaturalKeys !==null && props.visibleNaturalKeys !== undefined && props.visibleNaturalKeys){

      let keysCnt = 0;
      let key0 = null;
      let key1 = null;
      while( keysCnt < numberOfWhiteKeys ){
        for (let i = 0; i < whiteKeySounds.length; i++) {
          if(keysCnt >= numberOfWhiteKeys ){
            break;
          }
          const key = new PianoKey(
            keyShape,
            new Transform({
              position: new Vector3(whiteKeyLen/2, whiteKeyYOffset, whiteKeyXPos + (KEY_DIR *  0.4)),
              scale: new Vector3(0.7, whiteKeyLen, 0.5),
              rotation: ROTATION_Q_90_90_0_E.clone(),
            }),
            whiteKeyTransparent,
            whiteKeyColor,
            whiteKeyGlowColor,
            naturalToneKeyEmissiveIntensity,
            enableSound ? whiteKeySounds[i] : null,
            triggerWhitePianoKey,
            keysCnt,
            thisParentId
          )
          key.name = 'key-' + thisParentId + "."  + keysCnt

          if(key0 == null){
            key0 = key
          }else if(key1 == null){
            key1 = key
            log("key1 set to " + key1.name);
          }
          
          key.addComponent( new utils.OriginTransform(key0,host,this._scene) )
          if(props.enableClickable !==null && props.enableClickable !== undefined && props.enableClickable){
            key.addComponentOrReplace( new OnPointerDown(
              () => {
                //let pos = getEntityWorldPosition(key);
                //let pos0 = getEntityWorldPosition(key0)
                /*
                //TODO activate key and timer to turn off
                grass.getComponent(Transform).position = pos.clone()
                //adjustForSceneRotation( grass.getComponent(Transform).position, key1 ) 
                let relativeRotate = pos.subtract(pos0).rotate( Quaternion.Euler(0, 90, 0) )

                let parentRotEuler = host.getComponent(Transform).rotation.eulerAngles
    
                //const parRotAbsX = Math.abs(parentRotEuler.x)
                const parRotAbsY = Math.abs(parentRotEuler.y)
                log("parRotAbsY " + parRotAbsY)
                //when rotated piano rotated 90
                if( (parRotAbsY > 89 && parRotAbsY < 91) || (parRotAbsY > 269 && parRotAbsY < 271) ){
                  grass.getComponent(Transform).position.x = pos0.x
                  grass.getComponent(Transform).position.z = pos0.z + relativeRotate.z
                }else{//non rotated
                  grass.getComponent(Transform).position.z = pos0.z
                  grass.getComponent(Transform).position.x = pos0.x + relativeRotate.x
                }
                log("key " + key0.name + " " + pos + " vs key0 " + pos0 + " " +  relativeRotate  )
                log("key " + key.name + " " + pos + " vs adjusted " + grass.getComponent(Transform).position)
                */
                

                //log("trigger" +  getEntityWorldPosition(key.getComponent(utils.TriggerComponentCE).shape))
              },
              {
                button: ActionButton.POINTER,
                hoverText: "Play Key " + keysCnt,
                distance: 6,
                showFeedback: true
              }
            ) )
          }
         // 

          key.setParent(entity)
          keys[thisParentId].push(key)
          whiteKeyXPos += KEY_DIR * 0.8

          keysCnt++;
        }
      }

      whiteKeyCount = keysCnt
    }
    
    let blackKeyXPos = whiteKeyXPosStart - 0.4 - .4
    let skipKey = 1
    
    if(props.visibleFlatSharpKeys !==null && props.visibleFlatSharpKeys !== undefined && props.visibleFlatSharpKeys){
      let keysCnt = 0;
      while( keysCnt < numberOfBlackKeys ){
        for (let i = 0; i < blackKeySounds.length; i++) {
          if(keysCnt >= numberOfBlackKeys ){
            break;
          }
          const key = new PianoKey(
            keyShape,
            new Transform({ 
              position: new Vector3(blackKeyLen/2, 0.12, blackKeyXPos),
              scale: new Vector3(0.45, blackKeyLen, 0.5),
              rotation: ROTATION_Q_90_90_0_E.clone(),
            }), 
            blackKeyTransparent,
            blackKeyColor,
            blackKeyGlowColor,
            blackToneKeyEmissiveIntensity,
            enableSound ? blackKeySounds[i] : null,
            triggerBlackPianoKey,
            keysCnt + whiteKeyCount,
            thisParentId
          )
          key.setParent(entity)
          keys[thisParentId].push(key)
        
          // Skip key
          skipKey++
          skipKey % 3 != 0 ? (blackKeyXPos -= 0.8) : (blackKeyXPos -= 1.6)
          if (skipKey == 6) skipKey = 1

          keysCnt++;
        }
      }
    }
  }
}

function getColorFromString(naturalToneKeyColor:string,theDefault:Color3){
  
    let color:Color3 = theDefault;
    if(naturalToneKeyColor!==null&&naturalToneKeyColor!==undefined){
      if(naturalToneKeyColor?.indexOf("#")==0){
        color = Color3.FromHexString(naturalToneKeyColor)
      }else{
        switch(naturalToneKeyColor?.toLowerCase()){
          case 'white': color = Color3.White(); break;
          case 'black': color = Color3.Black(); break;
          case 'blue': color = Color3.Blue(); break;
          case 'green': color = Color3.Green(); break;
          case 'red': color = Color3.Red(); break;
          case 'yellow': color = Color3.Yellow(); break;
          case 'purple': color = Color3.Purple(); break;
          case 'magenta': color = Color3.Magenta(); break;
        }
      }
    }
    log("getColorFromString " + naturalToneKeyColor + ";->" + color)
    return color;
}


function adjustForSceneRotation(playerPosition:Vector3,entity:IEntity){
  //only do if took fresh positions
  let loopCnt = 0;
  let entPar:IEntity = entity
  let lastTransform:Transform = null;

  //return playerPosition

  //log("zNorth entPar "+loopCnt+" " + entPar+ " " + entPar.uuid)
  while(entPar != null && entPar.getParent() != null){
    entPar = entPar.getParent()
    
      //log("entPar " +loopCnt+" " + entPar+ " " + entPar.uuid)
    if(entPar.hasComponent(Transform)){
      lastTransform = entPar.getComponent(Transform)
      //log("entPar " +loopCnt+" got it from " + entPar + " " + entPar.uuid + " position " + lastTransform.position + " " + lastTransform.rotation.eulerAngles )
    }
    loopCnt++;
  }

  if(lastTransform != null && (lastTransform.position.x!=0 || lastTransform.position.y!=0 || lastTransform.position.z!=0)){
    //playerPosition = playerPosition.rotate(lastTransform.rotation.conjugate())
    //playerPosition = playerPosition.rotate(lastTransform.rotation)//for rotated

    //TODO test on odd shaped parcel
    let parentRotEuler = lastTransform.rotation.eulerAngles
    
    //const parRotAbsX = Math.abs(parentRotEuler.x)
    const parRotAbsY = Math.abs(parentRotEuler.y)
    //const parRotAbsZ = Math.abs(parentRotEuler.z)
    //16,0,16 for 180 counter:16,0,16// 0,0,16 for 90, counter 16,0,0// 16,0,0 for -90 counter:0,0,16
    if(parRotAbsY > 179 && parRotAbsY < 181 ){
      playerPosition.addInPlace(lastTransform.position); //sum the adjusted x,z
    }else if( (parRotAbsY > 89 && parRotAbsY < 91) || (parRotAbsY > 269 && parRotAbsY < 271) ){
      //playerPosition.addInPlace(new Vector3( lastTransform.position.z,lastTransform.position.y,lastTransform.position.x ));  //sum the flipped x,z
      //rotated
      //playerPosition.x += 0
      //playerPosition.z += 16/2 //for 
      //non rotated
      //playerPosition.x -= 16/2
      //playerPosition.z += 16 //for 
      //playerPosition.x = playerPosition.z
      //playerPosition.z = playerPosition.x
      // log(playerPosition.subtract(entity.getComponent(Transform).position))
    }
  }else{
    log("adjustForSceneRotation no work needed")
  }
}


function getEntityWorldPosition(entity: IEntity): Vector3 {
  //log("getEntityWorldPosition called for " + entity.name)
  let entityPosition = entity.hasComponent && entity.hasComponent(Transform)
    ? entity.getComponent(Transform).position.clone()
    : Vector3.Zero()
  let parentEntity = entity.getParent()

  //return entityPosition;

  if (parentEntity != null && parentEntity.uuid != '0') {
    let parentRotation = parentEntity.hasComponent(Transform)
    ? parentEntity.getComponent(Transform).rotation
    : Quaternion.Identity
    let origPosition = entity.hasComponent(Transform)
    ? entity.getComponent(Transform).position
    : Quaternion.Identity

      let parentPosition = parentEntity.hasComponent(Transform)
      ? parentEntity.getComponent(Transform).position
      : Quaternion.Identity


    let toAdd = entityPosition.rotate(parentRotation);
    if(parentEntity.hasComponent(Transform)){
      toAdd = toAdd.multiply(parentEntity.getComponent(Transform).scale)
    }

    log("getEntityWorldPosition called for " + (entity as Entity).name + " position: " + origPosition + " vs rotated " + entityPosition + " parent " + (parentEntity as Entity).name +  " r:" + parentRotation.eulerAngles + " p:" + parentPosition )

      //TODO ADD multiply by scale
    return getEntityWorldPosition(parentEntity).add( toAdd )
    
  }
  log("returning called for " + (entity as Entity).name + " position: " + entityPosition )

  return entityPosition
}