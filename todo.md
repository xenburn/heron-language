## Some things to do

[] - I can't write "0.repeat" it complains, because not 
[] - Fix the problem with Myna not reporting the correct location in an error. 
[] - Add IDs to Myna 
[] - Sound processing
[] - Something animated 
[] - Speed up execution
[] - Float assignment operations (e.g. "v.x = 3" )
[] - Automatic setters 
[] - Bounding box computations 
[] - Bounding sphere computations
[] - Voronoi 
[] - Poisonnian algorithms 
[] - Some noise algorithms 
[] - A way to output parameter descriptions
[] - A way to reflect over functions 
[] - Distance from spline to point 
[] - Push modifier 
[] - Heron normal form conversion 
[] - SineWave Tube 
[] - Arrow (as volumetric and as mesh )
[] - Volumetric shaders working
[] - Get vector * float working
[] - Get arithmetic operators working on arrays
[] - Quaternion math
[] - Float2,Float3,Float4
[] - Tests for vectors and other things like that
[] - A simple generation test of GLSL code.
[] - Performance benchmarks of generated Heron code (unoptimized vs optimized)
[] - Remove my node modules
[] - Move the type-inference code back into its own repository (making sure to follow the Heron model, with the TS and the JS in the same place?)
[] - Add linter support 
[] - Turn on some errors
[x] - Get deepscan working 
[] - Get Deepscan badge
[] - Put the project into Travis CI
[] - Get a version of the project working in the browser 
[] - There is a problem with the parser not reporting error locations correctly
[] - Fix operator overloading problem. 
[] - Add a "transform" 
[] - Replace refs/defs
[] - Fix that a lot of stuff is just scattered everywhere (FuncDef??)
[] - Parameters should not have types, instead: get them from the function. 
[] - Type code should be simplified. 
[] - Start running linter 
[] - replace sumComponents with sum. For some reason, it is struggling to figure out the type of that.
[] - Output the AST: with types 
[] - Trailing commas kill the compiler with no user feedback!
[] - No parse error.
[] - Missing the semicolon at end of sentence. l
[] - More types in the output 
[] - Start inlining 
[] - Add some colors 
[] - Animate the motion
[] - Perlin noise the thing? 
[] - Poissonian point distribution
[] - Point cloud render support 
[] - Instancing support 
[] - Teapot 
[] - Mobius strip
[] - Klein bottle
[] - Physics
[] - Bounce 
[] - Cone
[] - Arrow.
[] - Clean up code / repo
[] - Get a browser version of compiler working. 
[] - de-lint

//==

Get some of the shaders to work. 
https://www.vertexshaderart.com/new/

//== 

Notes:

The following is incorrect. 

 
 so 

    else if (expr instanceof FunCall) {
            let func = this.getType(expr.func);
            const argTypes = expr.args.map(a => this.getType(a));

//==

Once I know the function type (assuming I do)

I can then refine the types of the arguments. 

Of course sometimes the types of the arguments, defines the function type, which then defines the types of the arguments.

This goes on a bit, but it isn't that complicated. 

The idea is simple: 
1. I know what function I am calling: therefore, I know the type of the lambda, specifically. 

A choose better function arg type. 

This really mostly happens at a call site. 

Let's say I know the types of the other arguments, then the lambda can possibly be inferred. 

I can phrase it this way: once I know the types of the arguments, can I refine the type of a lambda
any further.

RefineLambdaTypes. Works for me. 

//==

Not sure what to do.  

Computing function type for normal(v : any) : any
Type for normal(v : any) : any
 is (Func Float2 Float)

 Clearly wrong.999++

 
zip(xs : any, ys : any, f : any) : any
tests.ts:144
 : (Func (Array T0) (Array T1) (Func T2 T1 T3) (Array T3))

 //==

 So I need some specific tests in place:
 
1. Get the type of a function X. 
2. What is the process for getting the type? 

I can do different things to compute it. 

//==

It was working a short bit ago, and now it is screwed up again. 

//==

There is a problem because it is reusing variables tht it shouldn't. 

//==

Right now I think the biggest problem is "Float2". 

//==

Some problems:
* Transform
* Flatten
* Reduce
* Zip

It seems that when a call happens it doesn't really constrain all of the types? 

If a call has a specific type 

I may need to . . . 

Perfect example: 

all(xs : any, p : any) : any
 : (Func (Array T0) (Func T1 Bool) Bool)

//==

reduce -> big problem

The type of reduce is correct. 
What I see is that I am passing 

I need to track the actions of a specific function. 

"all". 

//==

When I make a function call, with a function that is an argument, I should unify it? 

* Map has type T => T, which is wrong.

I think the problem is the presence of `T` which is incorrect. It gets confused. Every function type has to have its type variables replaced. 

I see a problem where a lot of array operations are "Int" where they are actually number.

For example: "average"
The flatMap is correct. 
BUT flatten is incorrect.

We can see the problem with flatten right here: 

Unifying argument concat with !'@9.(Func (Array '@9) (Array '@9) (Array '@9)) and (Func '@93 '$1 '@93) is !'@9!'$3.(Func (Array '$3) (Array '@9) (Array '$3))

I think this goes right to the heart of the problem.

                    /*
                    // I can see this being something we want for arrays as well.
                    if (arg instanceof Lambda && exp instanceof PolyType) {
                        // Recompute the HeronType now based on the expected HeronType.
                        trace("funcType", "Getting an improved lambda type");
                        trace("funcType", "Original: " + arg.type);
                        trace("funcType", "Shape: " + exp);
                        arg.type = getLambdaType(arg, this.unifier, exp);
                        trace("funcType", "Updated: " + arg.type);                        
                        if (!arg.type)
                            throw new Error("Failed to get a recomputed lambda type");
                        argTypes[i] = arg.type;
                    }

                    // Unify again.
                    this.unify(arg.type, exp);
                    */

The problem right now comes to the fact that the right function is not known. 

1) Everybody is working out their type fine. At least functions are.
2) Possibly the expressions are as well. I should check that.
3) It is possible that the wrong function is being used temporarily, but is figured out afterwards. 

The issue really is that some things reference a function set, and when they do, we want to know which 
function it is they chose. 

A similar problem is going to arise when we try to figure out constants. 

Basically it is all an issue of abstract value. Every expression refers to a value. 

That abtsract value could be a: 
1. A number, string, function set, actual function, a type, a range, an array, a boolean, a 'type' value,   

Doing this I think is going to simplify things. 

The problem is that I have been kind of hacking stuff to get it to work. 

So how am I going to associate expressions with values? 

And what about defs? Well those are just types.

Note: the thing is that the compiler needs to track functions down as much as possible. It has to do some inlining. 

Multiple expressions might share the same value. So I need an abstract evaluator? 

The thing is that "assignment" is different than the values. Two things might have the same unified type, but they 
could also have different values. (X = Y), (X = A), (B = Y). 

Assignment is different than unification. Getting the value isi much different than getting the type. 

However, there is still an issue. Types get improved. 

I think I am going to have to make another pass of a function. I have all of the types at the end. 

Next, I need to figure out if each functionIndex is the best bet.

//==

average(xs) :: (Func (Array Int) Int)
cylinderPoint(u, v) :: (Func Int Float Float3)
eq(xs, ys) :: (Func (Array T0) (Array T1) Bool)

//==


//== 

function cartesianProduct_2000(xs, ys, f)
{
  const r = [];
  for (let i=0; i < xs.count; ++i) 
    for (let j=0; j < ys.count; ++j)
      r.push(f(xs.at(i), ys.at(j)));
  return arrayFromJavaScript(r);

//== 

Clean up code / repot

#define PI radians(180.)
#define NUM_SEGMENTS 4.0
#define NUM_POINTS (NUM_SEGMENTS * 2.0)
#define STEP 5.0

vec3 hsv2rgb(vec3 c) {
  c = vec3(c.x, clamp(c.yz, 0.0, 1.0));
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  float point = mod(floor(vertexId / 2.0) + mod(vertexId, 2.0) * STEP, NUM_SEGMENTS);
  float count = floor(vertexId / NUM_POINTS);
  float snd = texture2D(sound, vec2(fract(count / 128.0), fract(count / 20000.0))).a;
  float offset = count * 0.02;
  float angle = point * PI * 2.0 / NUM_SEGMENTS + offset;
  float radius = 0.2 * pow(snd, 5.0);
  float c = cos(angle + time) * radius;
  float s = sin(angle + time) * radius;
  float orbitAngle =  count * 0.0;
  float innerRadius = count * 0.001;
  float oC = cos(orbitAngle + time * 0.4 + count * 0.1) * innerRadius;
  float oS = sin(orbitAngle + time + count * 0.1) * innerRadius;

  vec2 aspect = vec2(1, resolution.x / resolution.y);
  vec2 xy = vec2(
      oC + c,
      oS + s);
  gl_Position = vec4(sin(xy) * aspect + cos(mouse * 2.0), 0, 1);

  float hue = (time * 0.01 + count * 1.001);
  v_color = vec4(hsv2rgb(vec3(hue, 1, 1)), 1);
}

//==

Get some time algorithms happening

//==

I want to get the loft tool working. 

Give the thing a series of matrices, a base shape and it computes the tube following it. 

Note: 

I also really want to define a scene object. And I want to generate C++, and ... 

Generate the types.

//==

Modifier? 
* Push
* Cubify
* Spherify
* Transform (Skew/Twist/Taper)
* Bend
* Jitter
* Relax 

//== //== //== 

* Torus / Sphere / Cylinder / Klein / Knot / Box / Platonic solid / N bottom pyramid / Prism /  

//== //== //== 

TODO:
https://www.npmjs.com/package/xml-js

MCG -> Heron

//==

Function inliner: partial evaluation.

This is key. To get this to work I will have to simplify and streamline the representation. 

Maybe put things in some kind of normalized form. 

There are many different options there: I want to keep things similar to the original form obviously,
BUT, at the same time, performing transformations is much easier if I normalize. 

Therefore there are some choices to be made. There is nothing wrong with having the same code
in multiple forms. 

//==

Heron normal form - for optimization. 

Related to ANF/SSA and CPS  
* https://en.wikipedia.org/wiki/A-normal_form
* https://en.wikipedia.org/wiki/Continuation-passing_style
* https://en.wikipedia.org/wiki/Static_single_assignment_form

Requires: 
1. Closures to be clearly define. 
1. Conditionals. (efficient execution requires conditional expressions)

All functions have either:
1. Am I 

In some cases I am going to want to augment my types (e.g. mapWithClosure).

For conversion of Filters to GLSL, I can imagine using a "FilteredArray" struct. 

Most of GLSL is actually going to be "inlining" of a function. 

I plan on absolutely falling apart in the presence of recursion. 

Recursion is so overrated. 

A function without a closure, and a function with a closure, are different. 

This is good to distinguish because I can get some stuff in a very happy place. 

I need AST nodes. 
I need Parse locations. 
I need to have variable/parameter definitions and stuff. 

Heron normal form is going to be designed as a proper standalone API for:
1. Evaluation
2. Optimization 
3. Type-checking 

What I want from HNF is: 
1. TO simplify expressions.
1. Compute certain values at the right time. 
1. To inline stuff 

//==

If I can generate more efficient JavaScript code, I think we have something. 

I could probably show it through some benchmarks of: 

//===

So there are like three things:
* I want normals.
* I would like a torus knot 
* I would like to try generating just a little bit of shader code.

* Teapot / bunny / 

* Meshing using billboards? 
* Random rendering / ray-tracing. 
* "Scene" as an API: 
* Using Heron as a file format

* Mesh 

http://acko.net/
http://acko.net/blog/shadergraph-2/
http://acko.net/blog/mathbox2/
http://acko.net/blog/a-dom-for-robots/ 
http://acko.net/blog/yak-shading/ 
http://acko.net/files/mathbox2/iframe-volume.html
 

//==

This could really compete in the space of processing, or be used with D3

3D Library ,amage,emt/ 

// 

Normal as the average of all touching faces? 

I really want to a "deform" with strength. 

Also the simple equation I had fro: 

position/ rotation / scale. 

//==

I really need:

1. Optional arguments
2. Setters
3. Objects 

//==

Check if buffers are zero ... if so we don't add that attribute. 

//==

Do I want to do strength? It could be added to the shader? 

// STrength cocmputation
Strength from X axis, Y axis, Z axis, Distance from 

// So let's say I do a transform shader? 

Well I will need quaternion support. 

Distance point to spline:
* https://www.tinaja.com/glib/cmindist.pdf
* http://homepage.divms.uiowa.edu/~atkinson/ftp/CurvesAndSufacesClosestPoint.pdf

// https://prideout.net/blog/?p=44
// https://github.com/mrdoob/three.js/blob/master/src/geometries/ParametricGeometry.js
// https://github.com/mrdoob/three.js/blob/master/examples/js/ParametricGeometries.js
// https://paulbourke.net/geometry/
// https://github.com/mrdoob/three.js/tree/master/src/geometries

// TODO: https://github.com/mrdoob/three.js/blob/master/examples/js/CurveExtras.js
// TODO: https://github.com/mrdoob/three.js/blob/master/src/math/Color.js
// TODO: extrude, lathe, spirograph, colors (See tubeGeometry in Three.JS)
// TODO: https://github.com/mrdoob/three.js/blob/master/examples/js/geometries/TeapotBufferGeometry.js
