import { Logger, LoggerLevel } from './logging'
const logger = new Logger("utils.",{})

export const getEntityByName = (name: string,altEntity?: Record<string, IEntity>) :IEntity =>
  {
    const METHOD_NAME = "getEntityByName"
    logger.trace( METHOD_NAME,"ENTRY",[name,altEntity] )

    let val = Object.keys(engine.entities)
        .map((key) => engine.entities[key])
        .filter((entity) => (entity as Entity).name === name)[0]

    if(!val&&altEntity){
        val = altEntity[name]
    }
    logger.trace( METHOD_NAME,"RETURN",val )
    return val;
  }

export const getEntityByRegex = (name: RegExp,altEntity?: Record<string, IEntity>) :IEntity[] => {
    const METHOD_NAME = "getEntityByRegex"
    if(logger.isTraceEnabled()) logger.trace( METHOD_NAME,"ENTRY",[name,altEntity] )
    
  name.lastIndex = 0 //reset regex if already used
  
  let val:IEntity[] = Object.keys(engine.entities)
    .map((key) => engine.entities[key])
    .filter((entity) => name.test((entity as Entity).name))

  if(!val) val = []

  if( altEntity && Object.keys(altEntity).length>0 ){
    let valAlt:IEntity[] = Object.keys(altEntity)
        .map((key) => altEntity[key])
        .filter((entity) => name.test((entity as Entity).name))

    if(valAlt && valAlt.length > 0){
        let dict = {}
        
        for(const p in val){
            if(!val[p] || val[p]===undefined) continue
            
            let entityName = (val[p] as Entity).name;
            if(!dict[entityName]){
                dict[entityName] = val[p];
            }else{
                log("duplicate item found skipping " + p)
                if(logger.isDebugEnabled()) logger.debug( METHOD_NAME,"duplicate item found skipping " + entityName,[name,altEntity] )
            }
        }
        for(const p in valAlt){
            if(!valAlt[p] || valAlt[p]===undefined) continue

            let entityName = (valAlt[p] as Entity).name;
            if(!dict[entityName]){
                dict[entityName] = valAlt[p];
            }else{
                if(logger.isDebugEnabled()) logger.debug( METHOD_NAME,"duplicate item found in valAlt skipping " + entityName,[name,altEntity] )
            }
        }

        //now to list it
        let valConcat:IEntity[]=new Array()
        for(const p in dict){
            valConcat.push(dict[p])
        }
        val = valConcat
    }
  }

  if(logger.isTraceEnabled()) logger.trace( METHOD_NAME,"RETURN",val )
  return val;
}

export const getEntityBy = (name: any,altEntity?: Record<string, IEntity>) : IEntity[] => {
    const METHOD_NAME = "getEntityBy"
    if(logger.isTraceEnabled()) logger.trace( METHOD_NAME,"ENTRY",[name,altEntity] )

    let val:IEntity[] = null;

    if( typeof name == "string"){
        val = [getEntityByName(name,altEntity)];
    }else if(name instanceof RegExp){
        val = getEntityByRegex(name,altEntity)
    }else{
        log("unknown fetch type " + name)
    }
    if(!val){
        val = []
    }
    if(logger.isTraceEnabled()) logger.trace( METHOD_NAME,"RETURN",val )
    return val;
}


export class CacheEntry<T>{
    value: T
    createTimestamp: number
    lastFetchTimestamp: number

    constructor(args: {
        value: T
        createTimestamp: number
        lastFetchTimestamp: number
      }) {
        this.value = args.value
        this.createTimestamp = args.createTimestamp
        this.lastFetchTimestamp = args.lastFetchTimestamp
      }
}
export class CacheStats{
    hits: number = 0
    misses: number = 0
    size: number = 0
}

export interface ILazyMap<K,T>{
    get(name:K):T
    put(name:K,obj:T):void
    delete(name:string):T
}

export interface ITransformer<K,T>{
    transform(name: K):T
}

export class Cache<K,T> implements ILazyMap<string,T>{
    records: Record<string, CacheEntry<T>> = {}
    stats: CacheStats = new CacheStats();
    transformer: ITransformer<string,T>;

    constructor(args: {
        transformer?: ITransformer<string,T>
      }) {
        this.transformer = args.transformer
      }

    getRecord(name:string):CacheEntry<T>{
        return this.records[name];
    }
    get(name:string):T{
        //log("get  " + name )
        const obj = this.records[name];
        //log("get found " + obj )
        let val:T;
        if(obj){
            this.stats.hits++;
            obj.lastFetchTimestamp = +Date.now()
            val = obj.value
        }else{
            this.stats.misses++;
            val = this.transformer.transform(name)
            this.put(name,val)
        }
        return val;
    }
    put(name:string,obj:T){
        const currentTime: number = +Date.now()
        this.records[name] = new CacheEntry({value:obj,createTimestamp:currentTime,lastFetchTimestamp:currentTime});
        this.stats.size = Object.keys(this.records).length
        return obj;
    }

    delete(name:string){
        const obj = this.records[name];
        log("delete " + name + " found " + obj)
        let val:T;
        if(obj){
            val = obj.value
            delete this.records[name]
        }
        return val;
    }
}

export class EntityNameTransformer implements ITransformer<string,IEntity>{
    transform(name: string):IEntity {
        
        const entity = getEntityByName(name)
        log("transform " + name + " found " + entity)

        return entity;
    }
}

export const ENTITY_CACHE_BY_NAME_MAP: Cache<string,IEntity> = new Cache<string,IEntity>({transformer:new EntityNameTransformer()})


export function computeFaceAngle(lookAtTarget:Vector3,transform:Transform,lockMode:string,lockX:boolean,lockY:boolean,lockZ:boolean) {
    let lockW = false
    /*
    //START TESTING TO DETECT SDK

    //no help
    //froom builder
    //0,0:  facePlayer player rotate test:0.7933533402912352 3.727588677399492e-17 0.6087614290087207 4.85788814390261e-17 vs 0.7933533402912352 3.727588677399492e-17 0.6087614290087207 4.85788814390261e-17
    //from local
    //      facePlayer player rotate test:0.7933533402912352 3.727588677399492e-17 -0.6087614290087207 4.85788814390261e-17 vs 0.7933533402912352 3.727588677399492e-17 0.6087614290087207 4.85788814390261e-17

    let transformTemp = new Transform({
    rotation: Quaternion.Euler(180, 0, 0),//was y=75
    })
    transformTemp.rotate(Vector3.Up(), 75)

    let eulerTransform = Quaternion.Euler(180, 75, 0);
    let euler2StageRotate = transformTemp.rotation

    //compare rotations
    log("computeFaceAngle rotate test:" 
    + eulerTransform.x + " " + eulerTransform.y + " " + eulerTransform.z + " " + eulerTransform.w
    + " vs "
    + euler2StageRotate.x + " " + euler2StageRotate.y + " " + euler2StageRotate.z + " " + euler2StageRotate.w )
    //END TESTIN SDK DETECTION
    */
    
    let direction = lookAtTarget.subtract(transform.position)
    let endRotation:Quaternion = Quaternion.Slerp(
        transform.rotation,
        Quaternion.LookRotation(direction),
        1
    )
    if(lockX||lockY||lockZ){
        //default mode is quarternion.
        let canUseEuler = lockMode != null && lockMode == 'euler';
    
        const endRotationEuler:Vector3 = endRotation.clone().eulerAngles;//.clone().eulerAngles
    
        if(canUseEuler){ //tthe builder is running sub 6.6.4 (6.6.3 i think) and has bug with euler angle conversion
            let startingRotationEuler:Vector3 = transform.rotation.eulerAngles;
            
            if(lockX) endRotationEuler.x=startingRotationEuler.x
            if(lockY) endRotationEuler.y=startingRotationEuler.y
            if(lockZ) endRotationEuler.z=startingRotationEuler.z
            //if(lockW) endRotationEuler.z=transform.rotation.w //consider converting lock vectors to euler then passing back q more user friendly
            //no work right in lower 6.6.4
    
            //let transformTemp = new Transform({
            //  rotation: Quaternion.Euler(endRotationEuler.x, 0, 0),//was y=75
            //})
            //transformTemp.rotate(Vector3.Up(), endRotationEuler.y)
            //transformTemp.rotate(Vector3.Forward(), endRotationEuler.z)
            
            endRotation = Quaternion.Euler(endRotationEuler.x,endRotationEuler.y,endRotationEuler.z)
    
            //endRotation = transformTemp.rotation
        }else{ //works in builder but not sure this is valid rotation lock logic
            if(lockX) endRotation.x=transform.rotation.x
            if(lockY) endRotation.y=transform.rotation.y
            if(lockZ) endRotation.z=transform.rotation.z
            if(lockW) endRotation.w=transform.rotation.w //consider converting lock vectors to euler then passing back q more user friendly
        }
    }
    return endRotation;
}
    
export function computeMoveVector(start:Vector3,endDest:Vector3,lockX:boolean,lockY:boolean,lockZ:boolean,percentOfDistanceToTravel:float,moveNoCloserThan:float){
    //Math.min(noCloserThanPercentage,percentDistance)
    const distanceWhole = Vector3.Distance(start, endDest)
    let distanceDelta = distanceWhole;

    if(moveNoCloserThan){
        distanceDelta=distanceWhole-moveNoCloserThan;
    }
    
    //const endDestOrig=new Vector3().copyFrom(endDest)

    if(percentOfDistanceToTravel===undefined){
        percentOfDistanceToTravel = 1;
    }
    if(percentOfDistanceToTravel > 1){
        percentOfDistanceToTravel = percentOfDistanceToTravel/100
    }

    let percentStopDistToUse = 1;
    if(distanceDelta < .0001){
        percentStopDistToUse = 0
        //dont move
        endDest = new Vector3().copyFrom(start);
    }else if(distanceWhole > .0001){
        percentStopDistToUse = distanceDelta/distanceWhole;
        percentStopDistToUse = Math.min(percentStopDistToUse,percentOfDistanceToTravel);
        endDest = Vector3.Lerp(start, endDest, percentStopDistToUse)

        if(lockX) endDest.x=start.x
        if(lockY) endDest.y=start.y
        if(lockZ) endDest.z=start.z
    }
    //log("computeMoveVector " + start + " " + endDestOrig + " " + percentOfDistanceToTravel + " " + moveNoCloserThan + " " + distanceDelta + " returning " + endDest);
    return endDest;
}

    