(function(w){
    //Promise构造函数的形参是一个执行器回调函数，特点是立即同步执行，执行器回调函数可以传两个形参，参数分别是resolve,reject
    function Promise(excutor){

         /* 
        根据Promsie的特点可以知道，其身上有两大属性，分别是PromiseStatus、PromiseValue
            PromiseStatus是用来标记保存成功或者失败的状态的，初始值为pending；
            PromiseValue是用来保存成功或者失败时传递的数据；成功或者失败(是一个对立的命题)，初始值为undefined
            所以如果成功保存的就是成功的value值，失败保存的就是失败的reason;
        */
        

        //缓存自身this,防止出现函数嵌套，this更改指向的问题
        const self = this
            
        //此处用status和data来代替其两大属性
        self.status = 'pending' //初始值为无状态
        self.data = undefined //初始值为undefined，即还未被赋值

        //定义一个对象，用于存储成功或者失败后要执行的异步回调函数
        //以对象的形式存储，一个对象里面存储了两个属性，即成功的方法和失败的方法
        self.callbacks = []

       

        

        function resolve(value){
            //如果此时状态不是pending，即状态已经被更改过了，不能再进行二次更改，所以直接return;
            if(self.status !== "pending"){
                return
            }

            //1.更改内部状态为resolve;
            self.status = 'resolved'
            //2.内部数据赋值为成功时要传入的value;
            self.data = value

            //3.当回调数组(回调队列)中有待处理的回调函数时，立即异步执行callbacks中成功的回调函数
            if(self.callbacks.length>0){
                setTimeout(()=>{
                    self.callbacks.forEach(callbackObj => {
                        /* 
                        在自己定义的Promise构造函数里，如果状态延迟返回，但此时then方法里关于成功和失败的回调函数已经定义
                        此时就会导致状态永远不可能再被then里的回调函数监听到，永远也无法执行then里关于成功或者失败的回调函数，
                        所以可以在提前定义好的数组callbacks中添加需要执行的成功或者失败的方法，以备状态改变时调用
                        当状态改变时异步执行提前定义好的数组中关于成功或失败的回调函数
                        */
                        
                        callbackObj.onResolved(value)
                        
                    })
                })
                
            }
            

        }

        function reject(reason){
             //如果此时状态不是pending，即状态已经被更改过了，不能再进行二次更改，所以直接return;
             if(self.status !== "pending"){
                return
            }

            //1.更改内部状态为resolve;
            self.status = 'rejected'
            //2.内部数据赋值为成功时要传入的value;
            self.data = reason

            //3.执行callbacks中成功的回调函数
            if(self.callbacks.length>0){
                setTimeout(()=>{
                    self.callbacks.forEach(callbackObj => {
                        callbackObj.onRejected(reason)
                       
                   })
                })
                
            }
        }

        try{
            excutor(resolve,reject)
        }
        catch(error){
            reject(error)
        }

    }


    Promise.prototype.then = function(onResolved,onRejected){
        /* 
        判断onResolve、onReject是否为函数
        如果不是一个函数，就给他一个我们定义好的默认的函数，并将值直接传递给下个promise对象(值穿透)
        */
        onResolved = typeof onResolved === 'function'? onResolved : value => value;
        onRejected = typeof onRejected === 'function'? onRejected : reason => {throw reason}

        //缓存this
        const self = this
        //存储当前的状态
        let status = this.status
        

        //无论执行哪个回调函数最终返回的都是一个promise对象,其是成功或者失败要根据情况判定
        //(判定其成功或失败是为了下次调用then方法，因为then方法可以链式调用)
        return new Promise((resolve,reject)=>{

            //抽出重复代码封装为函数
            function handle(callback){
                //无论进入then方法的哪个回调函数，其执行结果都可能是成功或失败，其成功或者失败的状态取决于其返回值
                /* 
                注意：为什么调用onResolved()或者onRejected()要判断当前的状态，从而调用相应的resolve()和reject()?
                    是因为then方法链式调用的原则，当前.then()进入哪个回调函数是取决于调用then的promise对象的状态
                */
                try{
                    /* 
                    根据promise中then方法回调函数的特点，
                    可以通过其形参获取调用resolve()调用时传入的value值，即self.data;
                    */
                    let result = callback(self.data)
                    //如果当前没有抛出异常也可能有两种情况
                    //1.返回的是promise对象
                    if(result instanceof Promise){
                        /* 
                        此时result是个promise对象，不能够直接得到它的状态，但是可以调用then()方法，
                        如果是成功的状态，则会进入第一个回调函数，如果是失败的状态则会进入第二个回调函数
                        总之就是要根据rusult这个promise对象的状态调用相应的成功(resolve())或失败(reject())的方法
                        
                        详细写法如下：
                        result.then(
                            value => resolve(),//这里面的内容是我们自己定义的，
                            reason => reject()
                        )
                         主要就是要得到resolve()或者reject(),外层函数可以摘掉，所以可以简写为以下形式   
                         因为result作为一个promise对象总会有一个成功或者失败的状态，可以利用then()方法调用的特点
                         成功或者失败进入不同的回调函数，从而返回result的状态  
                        */
                        result.then(resolve,reject)
                    }else{
                        //进入else说明此时没有抛出异常，返回的结果也不是promise对象，所以直接包装成promise成功的状态即可
                        resolve(result)
                    }

                }catch (error){
                    //进入catch说明此时抛出异常，改变内部状态为失败，即调用reject()
                    reject(error)

                }
            }

            //首先先判断当前的status,才能确定到底执行哪个回调函数
            if(status === 'resolved'){

                setTimeout(()=>{
                    handle(onResolved)
                })
            
                
            }else if(status === 'rejected'){
                setTimeout(()=>{
                    handle(onRejected)
                })
            }else{
                
                /* 
                此处的执行场景是当上一次返回的promise对象里的成功或失败的结果延迟返回时，
                此时调用then方法不会进入到成功或失败的回调处理函数中，
                但是callbacks里追加了成功或失败的方法后，一旦上一个延迟执行的promise对象返回成功或失败的结果，
                立刻就会调用数组里成功或失败的回调函数
                (该步骤要结合上面resolve和reject方法里的最后一行代码理解)
                */
               //以上两种状态都不符合时，说明当前无状态，即可以往上面的callbacks中添加待执行的回调函数了
                self.callbacks.push(
                    {
                        /* 
                        此处onResolve，onReject的调用场景是当调用resolve或reject时，
                        跟Promise.prototype.then中的形参没有任何关系
                        */
                        //说白了，此处改成a,b也可以，只要和上面resolve()或reject()方法里的名字保持一致即可
                        onResolved(value){
                            //此处的函数体内容不可省略，如果省略，当调用时，根本不会有执行，因为函数体为空
                            handle(onResolved)
                        },
                        onRejected(reason){
                            handle(onRejected)
                        }
                    }
                )
            }
        })


    }


    //catch方法实质上是then方法只执行第二个回调函数，其他内容都一样
    Promise.prototype.catch = function(onRejected){
        return this.then(undefined,onRejected)
    }


    /* 
    Promise.resolve()方法返回的新的promise状态要根据其传入的参数的类型，或者状态(如果传入的是个promise对象)而定；
    Promise.reject()方法则无论传入的参数是什么，返回的总是一个失败状态的新的promise对象
    */

    /*
    返回一个指定了成功value的promise对象
    value: 一般数据或promise
   */

    Promise.resolve = function(value){
        return new Promise((resolve,reject)=>{
            if(value instanceof Promise){
                value.then(resolve,reject)
            }else{
                resolve(value)
            }
        })
    }

    
    /*
    返回一个指定了失败reason的promise对象
    reason: 一般数据/error
   */

    Promise.reject = function(reason){
        return new Promise((resolve,reject)=>{
            reject(reason)
        })
    }

    /* 
    返回一个新的promise对象，如果数组中所有promise对象都是成功的状态，则新的promise即成功，
    只要数组中有一个promise返回的是失败的状态，则新的promise即失败
    */
    Promise.all = function(promises){
        return new Promise((resolve,reject)=>{
            //定义一个累加器，用于判断当前数组中成功状态的promise对象的个数
            let num = 0
            //定义一个数组，用于将返回的成功状态的所有value值收集起来返回
            let values = new Array(promises.length)
            promises.forEach((item,index) => {
                /* 
                因为其每一项并不一定都是promise对象，而根据promise.all处理非promise对象是将其值直接返回，
                所以在此可以将其直接包装成promise对象
                */
                Promise.resolve(item).then(
                    value => {
                        num++
                        values[index] = value
                        //当所有的promise对象都成功时，改变内部状态为成功的状态
                        if(num === promises.length){
                            //将所有成功值的数组作为返回promise对象的成功结果值
                            resolve(values)
                        }
                    },
                    reason =>{
                        //一旦有一个promise产生了失败结果值, 将其作为返回promise对象的失败结果值
                        reject(reason)
                    }
                )
            })
        })
        
    }

    //返回一个新的promise对象，第一个成功或失败的promise对象的状态和value或reason值即新的promise对象的状态和value或reason值，
    Promise.race = function(promises){
        return new Promise((resolve,reject)=>{
            promises.forEach(item => {
                Promise.resolve(item).then(
                    //只要有一个成功了, 返回的promise就成功了
                    value => resolve(value),
                    //只要有一个失败了, 返回的结果就失败了
                    reason => reject(reason)
                )
            })
        })
    }




    w.Promise = Promise;

})(window);