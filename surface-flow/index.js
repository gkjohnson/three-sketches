import { App } from '../common/App.js';
import { SurfaceWalker, SurfacePoint, TriangleFrame } from './src/SurfaceWalker.js';
import { Mesh, SphereGeometry, TorusBufferGeometry, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const app = new App();
app.init( document.body );

const { camera, scene, renderer } = app;
camera.position.set( 5, 5, 5 );
camera.lookAt( 0, 0, 0 );

const mesh = new Mesh( new TorusBufferGeometry() );
mesh.material.wireframe = true;
scene.add( mesh );

const surf = new SurfaceWalker( mesh.geometry );
const point = new SurfacePoint();
const frame = new TriangleFrame();
surf._getFrame( 0, frame );

point.add( frame.a ).add( frame.b ).add( frame.c ).multiplyScalar( 1 / 3 );
point.index = 0;

const pmesh = new Mesh( new SphereGeometry( 0.01 ) );
pmesh.material.color.set( 0xff0000 );
pmesh.position.copy( point );
scene.add( pmesh );

const controls = new OrbitControls( camera, renderer.domElement );

const dir = new Vector3( 0, 0, 0.19 );
surf.movePoint( point, dir, point, dir );

const p2 = pmesh.clone();
p2.position.copy( point );
scene.add( p2 );






// surf._getFrame( 97, frame );
// point.copy( frame.a ).add( frame.b ).add( frame.c ).multiplyScalar( 1 / 3 );
// point.index = 97;

// const pm2 = new Mesh( new SphereGeometry( 0.01 ) );
// pm2.material.color.set( 0x00ff00 );
// pm2.position.copy( point );
// scene.add( pm2 );



// app.update = () => {

//     dir.normalize().multiplyScalar( 0.000001 );
//     surf.movePoint( point, dir, point, dir );
//     pmesh.position.copy( point );

// };

