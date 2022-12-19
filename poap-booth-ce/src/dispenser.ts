
import {Delay} from './decentralandecsutils/timer/component/delay'
//import * as UI from './decentralanduiutils/index'
import { getUserPublicKey } from "@decentraland/Identity"
import { getCurrentRealm } from '@decentraland/EnvironmentAPI'
import { setTimeout } from './decentralandecsutils/helpers/timeOut'
//import { sceneMessageBus } from "./game"

export class Dispenser extends Entity {
  
  idleAnim = new AnimationState("Idle_POAP", { looping: true })
  buyAnim = new AnimationState("Action_POAP", { looping: false })
  buttonAnim = new AnimationState("Button_Action", { looping: false })
  eventName: string
  clickable: boolean = true
  timeToClickable: number = 0
  channel:IChannel
  clickTime:Date

  //constructor(transform: TranformConstructorArgs, poapServer: string, eventName: string,channel:IChannel) {
  constructor(transform: TranformConstructorArgs, poapServer: string, eventName: string,clickButton: ActionButton,enabled:boolean,enableClickable:boolean,visible:boolean,hoverTextEnabled:string,hoverTextDisabled:string,enableTime:string,channel: IChannel) {

    super()
    engine.addEntity(this)
    
    log("dispenser poap4")

    if(visible){
      this.addComponent(new GLTFShape("models/poap/POAP_dispenser.glb"))
    }
    this.addComponent(new Transform(transform))

    this.addComponent(new Animator())
    this.getComponent(Animator).addClip(this.idleAnim)
    this.getComponent(Animator).addClip(this.buyAnim)
    this.idleAnim.play()

    this.channel = channel
    this.eventName = eventName

    const startingHoverText = enabled ? hoverTextEnabled : hoverTextDisabled;

    this.clickable = enabled

    let button = new Entity()
    if(visible){
      button.addComponent(new GLTFShape("models/poap/POAP_button.glb"))
    }

    
    button.addComponent(new Animator())
    button.getComponent(Animator).addClip(this.buttonAnim)
    button.setParent(this)
    button.addComponent(
      new OnPointerDown(
        (e) => {
          if (!this.clickable) { 
              log("poap not clickable returning " + this.clickable)
              return
          }

          button.getComponent(Animator).getClip("Button_Action").stop()
          button.getComponent(Animator).getClip("Button_Action").play()
          //sceneMessageBus.emit('activatePoap', {})

          if(enableTime !== null && enableTime !== undefined && enableTime.trim() !== ''){
            const now = new Date();
            const eventTimeDate:Date = new Date(Date.parse(enableTime));
            log("checking now " + now + " vs startTime " + eventTimeDate  + " " + now.getTime() + " " + eventTimeDate.getTime())
            if(eventTimeDate.getTime() > now.getTime() ){
              let dateFmt = eventTimeDate.toISOString()
              try{
                dateFmt = dateFmt.replace("T"," ")
                if(dateFmt.indexOf(":",15) > 0){
                  dateFmt = dateFmt.substr(0,dateFmt.indexOf(":",15)) + " UTC"
                }
              }catch(e){

              }
              UIdisplayAnnouncement("Event has not started yet.\nCome back at \n" + dateFmt, 5)
              return
            }
          }

          log("poap clickable go")
          this.clickable = false


          this.makeTransaction(poapServer, eventName)
        },
        { 
          hoverText: startingHoverText ,
          button: clickButton ? clickButton : ActionButton.POINTER,
          //hoverText: startingHoverText,
          //distance: 6,
          showFeedback: enableClickable
        }

      )
    )
    engine.addEntity(button)
    return this
  }

  public activate(): void {
    log("calling activate")
    let anim = this.getComponent(Animator)

    anim.getClip("Action_POAP").play()

    /*this.addComponentOrReplace(
      new Delay(4000, () => {
        anim.getClip("Action_POAP").stop()

        anim.getClip("Idle_POAP").play()
      })
    )*/
  }

  makeTransaction(poapServer: string, event: string) {
    const promise = executeTask(async () => {
      const userData = await getUserPublicKey();//"FIXME"//await getUserData()
      if (!userData ){//|| !userData.hasConnectedWeb3) {
        log("no wallet")
        UIdisplayAnnouncement("No wallet", 3)
        return
      }
      const realm = await getCurrentRealm()//{domain:"fixme","layer":"fixme"}

      const url = `https://${poapServer}/claim/${event}`
      let method = "POST"
      let headers = { "Content-Type": "application/json" }
      let body = JSON.stringify({
        address: userData,//userData.publicKey,
        catalyst: realm.domain,
        room: realm.layer,
      })
      
      try {
        let response = await fetch(url, {
          headers: headers,
          method: method,
          body: body,
        })
        let data = await response.json()
        this.clickable = true
        if (response.status == 200) {
          UIdisplayAnnouncement("A POAP token is being sent to your wallet", 3)
          //sceneMessageBus.emit("activatePoap", {})
          const action = this.channel.createAction("activatePoap",{})
          this.channel.sendActions( [action] )
          log("calling handlePoap " + this.eventName)
        } else {
          UIdisplayAnnouncement(`Oops, there was an error: "${data.error}"`, 3)
        }
      } catch(e) {
        this.clickable = true
        log("error fetching from POAP server ", url)
        UIdisplayAnnouncement(`Oops, there was an error: ` + e, 3)
      }
      return
    })
    return promise
  }
  
  
}

const canvas = new UICanvas()
let container: UIContainerStack = null

const getContainer = () => {
  if (!container) {
    container = new UIContainerStack(canvas)
    container.width = 800
    container.height = '100%'
    container.hAlign = 'center'
    container.vAlign = 'bottom'
    container.positionY = 50
  }

  return container
}

function UIdisplayAnnouncement(message: string, duration: number) {
  
  const text = new UIText(getContainer())
  text.value = message
  text.fontSize = 24
  text.height = 30
  text.width = '100%'
  text.hAlign = 'center'
  text.hTextAlign = 'center'


  setTimeout(duration * 1000,() => {
    text.visible = false
    text.height = 0
  })
}

