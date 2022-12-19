import { Dispenser } from './dispenser'

export type Props = {
  serviceUrl:string
  eventName:string
  enabled?:boolean
  enableClickable?: boolean
  visible?: boolean
  hoverTextEnabled?:string
  hoverTextDisabled?:string
  clickButton?: ActionButton
  enableTime?:string //example format 2015-05-01T22:00:00+00:00
}

log("poap loading... ")

//export let sceneMessageBus = new MessageBus()

export default class PoapBooth implements IScript<Props> {
  //model = new GLTFShape("models/poap/POAP_dispenser.glb")

  init() {
    log("poap init enter ")
  }

  toggle(entity: Entity, value: boolean) {
    
  }

  spawn(host: Entity, props: Props, channel: IChannel) {
    log("poap spawn enter ")
    //const entity = new Entity(host.name + '-poap-booth')
    //entity.setParent(host)
    //entity.addComponent(this.model);


    // POAP BOOTH
    const visible = props.visible !==null && props.visible !== undefined && props.visible;
    const enabled = props.enabled !==null && props.enabled !== undefined && props.enabled;
    const enableClickable = props.enableClickable !==null && props.enableClickable !== undefined && props.enableClickable;
    
    log("poap visible " + visible)
    log("poap enabled " + enabled)
    log("poap enableClickable " + enableClickable)

    const hoverTextEnabled = (props.hoverTextEnabled!=null && props.hoverTextEnabled != '') ? props.hoverTextEnabled : 'Get Attendance Token'
    const hoverTextDisabled = (props.hoverTextDisabled!=null && props.hoverTextDisabled != '') ? props.hoverTextDisabled : 'Disabled'
    
    /*let POAPBooth = new Dispenser(
      {
        position: new Vector3(0, 0, 0),
      },
      props.eventName,props.clickButton,
      enabled,enableClickable,visible,hoverTextEnabled,hoverTextDisabled,
      channel
    )*/

    let POAPBooth = new Dispenser(
      {
        position: new Vector3(0, 0, 0),
        rotation: Quaternion.Euler(0, 0, 0),
      },
      props.serviceUrl !== null && props.serviceUrl !== undefined && props.serviceUrl.trim() !== '' ? props.serviceUrl : "poapapi.dcl.guru",
      props.eventName
      ,props.clickButton,enabled,enableClickable,visible,hoverTextEnabled,hoverTextDisabled,props.enableTime,
      channel
    );

    POAPBooth.setParent(host);

    // MAKE POAP BOOTH MULTIPLAYER

    channel.handleAction('activatePoap', (action) => {
        if(enabled){
          POAPBooth.activate()
        }
      }
    );

    /*sceneMessageBus.on('activatePoap', () => {
      POAPBooth.activate()
    })*/

    // POAP BANNER
    if(false && visible){
      let POAPBanner = new Entity()
      POAPBanner.addComponent(
        new Transform({
          position: new Vector3(-2, 0, 0),
        })
      )
      POAPBanner.addComponent(new GLTFShape('models/poap/POAP_Banner.glb'))
      //engine.addEntity(POAPBanner)

      POAPBanner.addComponent(
        new OnPointerDown(
          (e) => {
            openExternalURL('https://www.poap.xyz/')
          },
          { hoverText: 'Learn More' }
        )
      )
    }

  }
}
