import * as utils from './decentralandecsutils/helpers/timeOut'

export type Props = {
  //active: boolean,
  fireWorkShapeName?: string
  //fireWorkShapeCustomName?: string
  onLaunch?: Actions //shared state
  onExplosion?: Actions //shared state
  hoverText?: string
}

export type FireworkArgs = {
  //active: boolean,
  //fireWorkShapeName?: string
  //fireWorkShapeCustomName?: string
  onLaunch?: Actions //shared state
  onExplosion?: Actions //shared state
  hoverText?: string
}

type LaunchType = {
  target: string
  id: number
  delay: number
}

//export let sceneMessageBus = new MessageBus()


export class Firework extends Entity {
  private fireworkLaunchSound = new AudioClip('sounds/fireworkLaunch.mp3')
  private fireworkExplodeSound = new AudioClip('sounds/fireworkExplode.mp3')
  channel:IChannel
  readyToLaunch: boolean = true
  id: number 
  onExplosion?: Actions
  onLaunch?: Actions
  
  constructor(model: GLTFShape, transform: Transform, id:number,channel:IChannel,args:FireworkArgs) {
    super()
    //engine.addEntity(this)
    this.addComponent(model)
    this.addComponent(transform)
    this.id = id
    this.channel = channel

    this.onExplosion = args.onExplosion
    this.onLaunch = args.onLaunch
    
    this.addComponent(new Animator())
    this.getComponent(Animator).addClip(
      new AnimationState('Play', { looping: false })
    )

    this.addComponentOrReplace(
      new OnPointerDown(
        () => {
          log("send launch" + this.id)
          //FIXME
          //sceneMessageBus.emit("launch", {id: this.id})
          const action = this.channel.createAction("launch",{ id: this.id, delay:0 })
          this.channel.sendActions( [action] );
        },
        {
          hoverText: args.hoverText !== undefined ? args.hoverText : 'Launch Firework', 
          distance: 6,
          button: ActionButton.POINTER,
        }
      )
    )
  }
  launch(){
    //TODO check if already launched, if so dont do anyting?
    if(!this.readyToLaunch){
      log(this.id + " not ready to launch. skipping")
      return;
    }
    this.readyToLaunch=false

    if(this.onLaunch !== undefined) this.channel.sendActions(this.onLaunch)

    // sound
    this.addComponentOrReplace(new AudioSource(this.fireworkLaunchSound))
    this.getComponent(AudioSource).playOnce()
    utils.setTimeout(1250, () => {
      this.addComponentOrReplace(new AudioSource(this.fireworkExplodeSound))
      this.getComponent(AudioSource).playOnce()
      if(this.onExplosion !== undefined) this.channel.sendActions(this.onExplosion)

    })

    // animation
    this.getComponent(Animator).getClip('Play').play()
    utils.setTimeout(4800, () => {
      this.getComponent(Animator).getClip('Play').stop()
      this.readyToLaunch=true
    })
    
  }
}

const fireworkShapes:GLTFShape[]  = [
  new GLTFShape('models/Firework_01.gltf'),//no image
  new GLTFShape('models/Firework_02.glb'),//will-face
  new GLTFShape('models/Firework_03.glb'),//DCL
  new GLTFShape('models/Firework_04.gltf'),//M
  new GLTFShape('models/Firework_05.glb'),//Fancy
  new GLTFShape('models/Firework_06.glb'),//Vivid
  new GLTFShape('models/Firework_07.glb'),//Walking City
]

const fireworkShapeNameCache  = {
  "Firework_01.gltf":fireworkShapes[0],//no image
  "Firework_02.glb":fireworkShapes[1],//will-face
  "Firework_03.glb":fireworkShapes[2],//DCL
  "Firework_04.gltf":fireworkShapes[3],//M
  "Firework_05.glb":fireworkShapes[4],//Fancy
  "Firework_06.glb":fireworkShapes[5],//Vivid
  "Firework_07.glb":fireworkShapes[6]//Walking City
}

export default class FireworkItem implements IScript<Props> {
  model = new GLTFShape("models/Firework_01.gltf")
  fireworks : Firework[] = []
  fireWorkNameToId = {}
  fireworkId: number = 0

  init() {}

  toggle(entity: Entity, value: boolean) {
    
  }

  spawn(host: Entity, props: Props, channel: IChannel) {
    //const entity = new Entity(host.name + '-firework')
    //entity.setParent(host)
    //entity.addComponent(this.model);

    let fireworkShape = null
    let fireWorkShapeName = props.fireWorkShapeName;

    const fireworkArgs:FireworkArgs = {...props}

    log("fireWorkShapeName model " + fireWorkShapeName)

    if( fireWorkShapeName && fireWorkShapeName != '' ){
      fireworkShape = fireworkShapeNameCache[ fireWorkShapeName ]
      if(!fireworkShape){
        fireworkShape = fireworkShapeNameCache[ fireWorkShapeName ] = new GLTFShape('models/' + fireWorkShapeName)
      }
    }
    log("fireWorkShapeName model obj " + fireworkShape)

    const fireworkId = this.fireWorkNameToId[host.name]=this.fireworkId++

    let firework1 = new Firework(
      fireworkShape,
      new Transform({
        position: new Vector3(0,0,0),
        //rotation: Quaternion.Euler(-45, 45, 25),
      }), 
      fireworkId,
      channel,
      fireworkArgs
    )
    firework1.onExplosion = props.onExplosion
    firework1.onLaunch = props.onLaunch
    
    firework1.setParent(host);

    this.fireworks.push(firework1)

    channel.handleAction<LaunchType>('launch', (action) => {
        const launchData = action.values
        this.launch(launchData)
      }
    )

    //TODO loop these
    channel.handleAction<LaunchType>('launchFirework', (action) => {
      const launchData = action.values

      if(!launchData.target){
        launchData.target = action.entityName
      }

      this.launch(launchData)
    }
  )

  }

  launch(launchData:LaunchType){

    if(launchData.id===undefined || launchData.id === null){
      launchData.id = this.fireWorkNameToId[launchData.target]
    }

    log("firework id " + launchData.id + " for " + launchData.target)

    if(launchData.delay && launchData.delay > 0){
      utils.setTimeout( launchData.delay ? launchData.delay:0, () => {
        log("LAUNCHING after delay ", launchData)
        this.fireworks[launchData.id].launch()
      })
    }else{
      log("LAUNCHING no delay ", launchData)
        this.fireworks[launchData.id].launch()
    }
  }
}

function toMilli(ms : number){
  return ms * 1000
}