import { Spawner } from '../node_modules/decentraland-builder-scripts/spawner'
import FireworkScript, { Props } from './item'

const script = new FireworkScript()
const spawner = new Spawner<Props>(script)

  
spawner.spawn(
  'firework1',
  new Transform({
    position: new Vector3(9, 0, 8),
    scale: new Vector3(1, 1, 1).setAll(1) //making it "avatar size" by default
  }),  
  { fireWorkShapeName:"Firework_02.glb",hoverText:"cust text" }
) 
     
 

spawner.spawn(
  'firework2', 
  new Transform({  
    //position: new Vector3(10, 0, 4 ),
    position: new Vector3(8, 0, 8 ),
    //rotation: Quaternion.Euler(0,30,0),
    scale: new Vector3(1, 1, 1).setAll(2   ) //making it "avatar size" by default
  }),   
  { fireWorkShapeName:"Firework_01.gltf" }
)
  