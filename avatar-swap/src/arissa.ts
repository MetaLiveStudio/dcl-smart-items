import config from './config'

const SINGLE_ANIMATION_NAME = "Armature|maximo.com|Layer0"


export const INSTANCES_LILDODGE = 'lildodge'

export const OFFSET:Record<string, Vector3> = {};// = [0]
export const Y_OFFSET:Record<string, number> = {} //= .05
export const Z_OFFSET:Record<string, Arissa[]> = {} //= -.1

OFFSET[  INSTANCES_LILDODGE ] = new Vector3(0,-.81,-.4)

export class Arissa extends Entity {
  
  lastState:string
  enabled:boolean
  visible:boolean
  enableAnimatorClips:boolean
  instanceType:string
  
  
  constructor(instanceType: string, model: GLTFShape, transform: Transform,enableAnimatorClips?:boolean,clip1Name?:string) {
    super()
    engine.addEntity(this)
    this.instanceType = instanceType
    this.addComponent(model)
    this.addComponent(transform)
  
    this.setAnimatorClips(enableAnimatorClips,clip1Name);  
  }
  setAnimatorClips(enableAnimatorClips?:boolean,clip1Name?:string){
    this.enableAnimatorClips = enableAnimatorClips !== null && enableAnimatorClips !== undefined && enableAnimatorClips
    //due to fun bug with what i only guess is a race condition animator gets locked up sometimes
    //if we can rely on the default animation til issue fixed (was told 6.6.6) then doing that
    //https://github.com/decentraland/unity-renderer/issues/985
    if(this.enableAnimatorClips){
      if(!this.hasComponent(Animator)) this.addComponentOrReplace(new Animator())
      this.getComponent(Animator).addClip(new AnimationState(clip1Name ? clip1Name : SINGLE_ANIMATION_NAME, { looping: true }))
      //stop them on in
      //this.stopAnimations()
      //this.getComponent(Animator).addClip(new AnimationState("Idle", { looping: true }))
    }
  }
  updatePosition(currentPosition: Vector3) {
    this.getComponent(Transform).position.x = currentPosition.x + OFFSET[this.instanceType].x
    this.getComponent(Transform).position.y = currentPosition.y + OFFSET[this.instanceType].y
    this.getComponent(Transform).position.z = currentPosition.z + OFFSET[this.instanceType].z
  }
  // Play running animation
  playRunning() {
    this.show();
    if(!config.CONSTANTS.SDK_664_OR_HIGHER) this.stopAnimations()
    this.lastState = "Running";
    //this.getComponent(Animator).getClip("Running").play()
    if(this.enableAnimatorClips) this.getComponent(Animator).getClip(SINGLE_ANIMATION_NAME).play()
  }

  // Play idle animation
  playIdle() {
    this.show();
    if(!config.CONSTANTS.SDK_664_OR_HIGHER) this.stopAnimations() //not needed if each instance is a single play action. 
    this.lastState = "Idle";
    //this.getComponent(Animator).getClip("Idle").play()
    if(this.enableAnimatorClips) this.getComponent(Animator).getClip(SINGLE_ANIMATION_NAME).play()
    
  }

  hide(){
    if(this.visible){
      const transform = this.getComponent(Transform);
      if(transform.scale.x != 0){//does checking before setting speed it up?
        transform.scale.setAll(0)
      }
      this.visible = false
    }
    //this.stopAnimations(); if stop animations must show them on show.  just let it play?
  }

  show(){
    if(this.enabled && !this.visible){
      const transform = this.getComponent(Transform);
      if(transform.scale.x != 1){//does checking before setting speed it up?
        transform.scale.setAll(1)
      }
      this.visible = true
    } 
  }

  enable(){
    this.show();
    this.enabled = true;
  }

  disable(){
    this.hide();
    this.enabled = false;
  }

  // Bug workaround: otherwise the next animation clip won't play
  // not needed in +6.6.5 version.
  // TODO conditionally activate this
  private stopAnimations() {
    if(this.enableAnimatorClips) this.getComponent(Animator).getClip(SINGLE_ANIMATION_NAME).stop()
    //this.getComponent(Animator).getClip("Idle").stop()
  }
}
