import { Spawner } from '../node_modules/decentraland-builder-scripts/spawner'
import PoapBooth, { Props } from './item'

const arrow = new PoapBooth()
const spawner = new Spawner<Props>(arrow)

spawner.spawn(
  'arrow',
  new Transform({
    position: new Vector3(4, 0, 8),
    scale: new Vector3(1,1,1)
  }),
  { 
      eventName:"willeent",serviceUrl:"",enabled:true,visible:true
  ,hoverTextEnabled:"enable text",hoverTextDisabled:"disabled text"
  ,enableClickable:true,enableTime:"" }
)
